import { IHeyGenStatusListenerBackend } from "./backend/HeyGenStatusListenerBackend";
import { HeyGenStatusListenerBackendPoll } from "./backend/HeyGenStatusListenerBackendPoll";
import { HeyGenStatusListenerBackendSSE } from "./backend/HeyGenStatusListenerBackendSSE";
import { HeyGenStatusListenerMode, HeyGenAPIOptions, StatusCallback } from "./types/Types";
import { SSEError } from "./errors/Errors";

/**
 * Exposes functions to interact with the Heygen API
 */
export class HeyGenAPI {
    /**
     * Internal instance of the status listener backend
     */
    private backend: IHeyGenStatusListenerBackend;

    /**
     * UUID to maintain authorization over jobs
     */
    private readonly uuid = crypto.randomUUID();

    /**
     * API Configuration
     */
    private options: HeyGenAPIOptions;

    /**
     * Constructs and configures the API interface based on the provided options
     * @constructor
     * @param options 
     */
    constructor(options: HeyGenAPIOptions) {
        this.options = this.configureDefaults(options);

        if (this.options.logging) {
            console.log(`\x1b[36m[heygen-lib]\x1b[0m[${new Date(Date.now()).toLocaleString()}] Options:`)
            console.log(this.options);
            console.log(`\x1b[36m[heygen-lib]\x1b[0m[${new Date(Date.now()).toLocaleString()}] Backend initialized to : ${HeyGenStatusListenerMode[this.options.mode]}`);
        }

        this.backend = this.configureBackend();
    }

    /**
     * Updates the polling interval for the POLL backend
     */
    public set pollInterval(value: number) {
        this.options.pollInterval = value;
    }

    /**
     * Sends the request to the API to create a new job
     * @returns ID of the created job
     */
    public async create(): Promise<number> {
        const response = await fetch(this.getUrl('create'), {
            method: 'POST'
        });

        const id = Number(await response.text());

        if (this.options.logging) {
            console.log(`\x1b[36m[heygen-lib]\x1b[0m[${new Date(Date.now()).toLocaleString()}] Job ID : ${id}, created`);
        }

        return id;
    }

    /**
     * Utility method that wraps the StatusCallback in a promise that resolves when
     * the job is completed
     * @param id ID of the job to wait for
     * @returns Promise of job completion
     */
    public waitForJob(id: number): Promise<void> {
        const promise = new Promise<void>((resolve, reject) => {
            try {
                this.listen(id, (_, msg) => {
                    if (this.options.logging) {
                        console.log(`\x1b[36m[heygen-lib]\x1b[0m[${new Date(Date.now()).toLocaleString()}] Job ID : ${id}, Status : ${msg}`);
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
     * Switches backend and transfer's the active listeners
     */
    public changeBackend(mode: HeyGenStatusListenerMode) {
        this.options.mode = mode === HeyGenStatusListenerMode.AUTO ? this.resolveAutoBackend() : mode;

        if (this.options.logging) {
            console.log(`\x1b[36m[heygen-lib]\x1b[0m[${new Date(Date.now()).toLocaleString()}] Backend changed to : ${HeyGenStatusListenerMode[this.options.mode]}`);
        }

        let currentJobs = this.backend.jobs();

        let fallbackBackend = this.configureBackend();

        currentJobs.forEach(job => fallbackBackend.listen(job[0], job[1], this.options));

        this.backend.dispose();

        this.backend = fallbackBackend;
    }

    /**
     * Subscribe to the status of a job
     * @param id ID of the job to listen
     * @param callback Callback to be invoked on status messages
     */
    public listen(id: number, callback: StatusCallback): void {
        this.backend.listen(id, callback, this.options);
    }

    /**
     * Stop listening for a job
     * @param id ID of the job to stop listening
     */
    public stop(id: number): void {
        this.backend.stop(id);
    }

    /**
     * Clears all listeners
     */
    public dispose(): void {
        this.backend.dispose();
    }

    /**
     * Configures defaults for options not provided
     * @param options User provided options
     * @returns Configured options
     */
    private configureDefaults(options: HeyGenAPIOptions): HeyGenAPIOptions {
        return {
            url: options.url,
            mode: options.mode === HeyGenStatusListenerMode.AUTO ? this.resolveAutoBackend() : options.mode,
            logging: options.logging ?? false,
            fallback: options.fallback ?? false,
            pollInterval: options.pollInterval ?? 1000
        } as HeyGenAPIOptions;
    }

    /**
     * Configures a backend based on the mode
     * @returns Configured backend
     */
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
     * Configures the SSE backend
     * @returns SSE backend
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
     * Configures the POLL backend
     * @returns POLL backend
     */
    private configureBackendPoll(): IHeyGenStatusListenerBackend {
        let backend = new HeyGenStatusListenerBackendPoll(
            this.options.url,
            this.uuid
        );

        return backend;
    }

    /**
     * Creates the UUID injected url, used for all api calls
     * @param route Route to invoke
     * @returns Configured URL
     */
    private getUrl(route: string): URL {
        const url = new URL(`${this.options.url}/${route}`);
        url.searchParams.set('uuid', this.uuid);
        return url;
    }

    /**
     * Resolves the AUTO backend based on platform and capability
     * @returns Resolved backend SEE or POLL
     */
    private resolveAutoBackend(): HeyGenStatusListenerMode {
        if (![typeof window, typeof document].includes('undefined')) { // Browsers
            return !!window.EventSource ? HeyGenStatusListenerMode.SSE : HeyGenStatusListenerMode.POLL;
        } else { // NodeJS
            return !!global.EventSource ? HeyGenStatusListenerMode.SSE : HeyGenStatusListenerMode.POLL;
        }
    }
}
