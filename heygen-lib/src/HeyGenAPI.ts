import { IHeyGenStatusListenerBackend } from "./backend/HeyGenStatusListenerBackend";
import { HeyGenStatusListenerBackendPoll } from "./backend/HeyGenStatusListenerBackendPoll";
import { HeyGenStatusListenerBackendSSE } from "./backend/HeyGenStatusListenerBackendSSE";
import { HeyGenStatusListenerMode, HeyGenStatusListenerOptions, StatusCallback } from "./types/Types";
import { SSEError } from "./errors/Errors";

/**
 * 
 */
export class HeyGenAPI {
    /**
     * 
     */
    private backend: IHeyGenStatusListenerBackend;

    /**
     * 
     */
    private readonly uuid = crypto.randomUUID();

    /**
     * 
     */
    private options: HeyGenStatusListenerOptions;

    /**
     * 
     * @param options 
     */
    constructor(options: HeyGenStatusListenerOptions) {
        this.options = this.configureDefaults(options);

        if (this.options.logging) {
            console.log(`[heygen-lib][${new Date(Date.now()).toLocaleString()}] Options:`)
            console.log(this.options);
            console.log(`[heygen-lib][${new Date(Date.now()).toLocaleString()}] Backend initialized to : ${HeyGenStatusListenerMode[this.options.mode]}`);
        }

        this.backend = this.configureBackend();
    }

    /**
     * 
     */
    public set pollInterval(value: number) {
        this.options.pollInterval = value;
    }

    /**
     * 
     * @returns 
     */
    public async create(): Promise<number> {
        const response = await fetch(this.getUrl('create'), {
            method: 'POST'
        });

        const id = Number(await response.text());

        if (this.options.logging) {
            console.log(`[heygen-lib][${new Date(Date.now()).toLocaleString()}] Job ID : ${id}, created`);
        }

        return id;
    }

    /**
     * 
     * @param id 
     * @returns 
     */
    public waitForJob(id: number): Promise<void> {
        const promise = new Promise<void>((resolve, reject) => {
            try {
                this.listen(id, (_, msg) => {
                    if (this.options.logging) {
                        console.log(`[heygen-lib][${new Date(Date.now()).toLocaleString()}] Job ID : ${id}, Status : ${msg}`);
                    }

                    if (msg === 'completed') {
                        this.stop(id)
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    
        return promise;
    }

    /**
     * 
     */
    public changeBackend(mode: HeyGenStatusListenerMode) {
        this.options.mode = mode === HeyGenStatusListenerMode.AUTO ? this.resolveAutoBackend() : mode;

        if (this.options.logging) {
            console.log(`[heygen-lib][${new Date(Date.now()).toLocaleString()}] Backend changed to : ${HeyGenStatusListenerMode[this.options.mode]}`);
        }

        let currentJobs = this.backend.jobs();

        let fallbackBackend = this.configureBackend();

        currentJobs.forEach(job => fallbackBackend.listen(job[0], job[1], this.options));

        this.backend.dispose();

        this.backend = fallbackBackend;
    }

    /**
     * 
     * @param id 
     * @param callback 
     */
    public listen(id: number, callback: StatusCallback): void {
        this.backend.listen(id, callback, this.options);
    }

    /**
     * 
     * @param id 
     */
    public stop(id: number): void {
        this.backend.stop(id);
    }

    /**
     * 
     */
    public dispose(): void {
        this.backend.dispose();
    }

    /**
     * 
     * @param options 
     * @returns 
     */
    private configureDefaults(options: HeyGenStatusListenerOptions): HeyGenStatusListenerOptions {
        return {
            url: options.url,
            mode: options.mode === HeyGenStatusListenerMode.AUTO ? this.resolveAutoBackend() : options.mode,
            logging: options.logging ?? false,
            fallback: options.fallback ?? false,
            pollInterval: options.pollInterval ?? 1000
        } as HeyGenStatusListenerOptions;
    }

    private configureBackend(): IHeyGenStatusListenerBackend {
        switch (this.options.mode) {
            case HeyGenStatusListenerMode.SSE:
                return this.configureBackendSSE();
            case HeyGenStatusListenerMode.POLL:
                return this.configureBackendPoll();
            default: // This will never happen, have to add it to make ts happy
                return undefined as any;
        }
    }

    /**
     * 
     * @returns 
     */
    private configureBackendSSE(): IHeyGenStatusListenerBackend {
        let onerror = (ev: Event) => {
            if (this.options.fallback) {
                this.changeBackend(HeyGenStatusListenerMode.POLL);
            } else {
                throw new SSEError(ev, 'Something went wrong with SSE');
            }
        }

        let backend = new HeyGenStatusListenerBackendSSE(
            this.options.url,
            this.uuid,
            onerror
        );

        return backend;
    }

    /**
     * 
     * @returns 
     */
    private configureBackendPoll(): IHeyGenStatusListenerBackend {
        let backend = new HeyGenStatusListenerBackendPoll(
            this.options.url,
            this.uuid
        );

        return backend;
    }

    /**
     * 
     * @param route 
     * @returns 
     */
    private getUrl(route: string): URL {
        const url = new URL(`${this.options.url}/${route}`);
        url.searchParams.set('uuid', this.uuid);
        return url;
    }

    /**
     * 
     * @returns 
     */
    private resolveAutoBackend(): HeyGenStatusListenerMode {
        if (![typeof window, typeof document].includes('undefined')) { // Browsers
            return !!window.EventSource ? HeyGenStatusListenerMode.SSE : HeyGenStatusListenerMode.POLL;
        } else { // NodeJS
            return !!global.EventSource ? HeyGenStatusListenerMode.SSE : HeyGenStatusListenerMode.POLL;
        }
    }
}
