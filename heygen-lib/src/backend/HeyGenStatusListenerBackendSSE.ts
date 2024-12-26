import { ListenerNotFoundError } from "../errors/Errors";
import { StatusCallback } from "../types/Types";
import { IHeyGenStatusListenerBackend } from "./HeyGenStatusListenerBackend";

/**
 * Internal SSE listener
 */
export class HeyGenStatusListenerBackendSSE implements IHeyGenStatusListenerBackend {
    private readonly source: EventSource;
    private readonly listeners: Map<number, [(ev: MessageEvent) => void, StatusCallback]>;

    /**
     * 
     * @param url 
     * @param callback 
     * @param onerror 
     */
    constructor (
        private readonly url: string, 
        private readonly uuid: string,
        private readonly onerror: (ev: Event) => void
    ) {
        this.source = new EventSource(this.getUrl());
        this.listeners = new Map();

        this.source.onerror = this.onerror;
    }

    /**
     * @returns tuple array of job id's and callbacks
     */
    jobs(): [number, StatusCallback][] {
        return Array.from(this.listeners.keys()).map(x => ([x, this.listeners.get(x)![1]]));
    }
    
    /**
     * Subscribe to the status of a job
     * @param id ID of the job to listen
     * @param callback Callback to be invoked on status messages
     * @param options API options
     */
    public listen(
        id: number, 
        callback: StatusCallback, 
        _options?: any
    ): void {
        let cb = (ev: MessageEvent) => {
            const data = JSON.parse(ev.data);
            callback(data.id, data.message);
        }

        this.source.addEventListener(this.getChannel(id.toString()), cb);

        this.listeners.set(id, [cb, callback]);
    }

    /**
     * Stop listening for a job
     * @param id ID of the job to stop listening
     */
    public stop(id: number): void {
        if (!this.listeners.has(id)) {
            throw new ListenerNotFoundError(`Job with ID: ${id} is not being listened`);
        }

        let cb : (ev: MessageEvent) => void = this.listeners.get(id)![0];

        this.source.removeEventListener(this.getChannel(id.toString()), cb);

        this.listeners.delete(id);
    }

    /**
     * Clears all listeners
     */
    public dispose() {
        this.source.close();
    }

    /**
     * Creates the UUID injected url, used for all api calls
     * @param route Route to invoke
     * @returns Configured URL
     */
    private getUrl(): URL {
        const url = new URL(`${this.url}/status`);
        url.searchParams.set('uuid', this.uuid);
        return url;
    }

    /**
     * Creates a channel string for a given job id
     * @param id Job id for which channel if being created
     * @returns Configured channel string
     */
    private getChannel(id: string): string {
        return `status_${id}`;
    }
}