import { IHeyGenStatusListenerBackend } from "./backend/HeyGenStatusListenerBackend";
import { HeyGenStatusListenerBackendPoll } from "./backend/HeyGenStatusListenerBackendPoll";
import { HeyGenStatusListenerBackendSSE } from "./backend/HeyGenStatusListenerBackendSSE";
import { HeyGenStatusListenerMode, HeyGenStatusListenerOptions, StatusCallback } from "./types/Types";
import { SSEError } from "./errors/Errors";

/**
 * 
 */
export class HeyGenStatusListener {
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
     * @param options 
     */
    constructor(private readonly options: HeyGenStatusListenerOptions) {
        this.options = this.configureDefaults(this.options);

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
        options.mode = options.mode ?? // Defaults to SSE if it's supported
            !!window.EventSource ? HeyGenStatusListenerMode.SSE : HeyGenStatusListenerMode.POLL;
        options.fallback = options.fallback ?? false;
        options.pollInterval = options.pollInterval ?? 1000;

        return options;
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

}
