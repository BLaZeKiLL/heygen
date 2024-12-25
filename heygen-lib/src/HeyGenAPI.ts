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

        console.log('[heygen-lib] Options:')
        console.log(this.options);

        switch (this.options.mode) {
            case HeyGenStatusListenerMode.SSE:
                this.backend = this.configureBackendSSE();
                break;
            case HeyGenStatusListenerMode.POLL:
                this.backend = this.configureBackendPoll();
                break;
            default: // This will never happen, have to add it to make ts happy
                this.backend = undefined as any;
                break;
        }
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
                        console.log(`[heygen-lib] Job ID : ${id}, Status : ${msg}`);
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

    /**
     * 
     * @returns 
     */
    private configureBackendSSE(): IHeyGenStatusListenerBackend {
        let onerror = (ev: Event) => {
            if (this.options.fallback) {
                this.handleFallback();
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
     */
    private handleFallback() {
        let currentJobs = this.backend.jobs();

        let fallbackBackend = new HeyGenStatusListenerBackendPoll(
            this.options.url,
            this.uuid
        );

        currentJobs.forEach(job => fallbackBackend.listen(job[0], job[1]));

        this.backend.dispose();

        this.backend = fallbackBackend;
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
