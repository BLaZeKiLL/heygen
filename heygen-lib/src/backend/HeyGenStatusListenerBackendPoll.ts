import { JobNotFoundError, ListenerNotFoundError } from "../errors/Errors";
import { StatusCallback } from "../types/Types";
import { IHeyGenStatusListenerBackend } from "./HeyGenStatusListenerBackend";

/**
 * Internal polling listener
 */
export class HeyGenStatusListenerBackendPoll implements IHeyGenStatusListenerBackend {
    private readonly listeners: Map<number, [NodeJS.Timeout, StatusCallback]>;

    /**
     * 
     * @constructor
     * @param url 
     */
    constructor (
        private readonly url: string,
        private readonly uuid: string,
    ) {
        this.listeners = new Map();
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
    public listen(id: number, callback: StatusCallback, options?: any): void {
        this.listeners.set(id, [setInterval(async () => {
            try {
                let response = await fetch(this.getUrl(id));

                if (response.status === 404 || response.status === 401) {
                    throw new JobNotFoundError(`Job with ID: ${id} was not found on the server`);
                } else {
                    let result = await response.text();
                    callback(id, result);
                }
            } catch (error) {
                throw error;
            }
        }, options.pollInterval ?? 1000), callback]);
    }

    /**
     * Stop listening for a job
     * @param id ID of the job to stop listening
     */
    public stop(id: number) {
        if (!this.listeners.has(id)) {
            throw new ListenerNotFoundError(`Job with ID: ${id} is not being listened`);
        }

        clearInterval(this.listeners.get(id)![0]);
        this.listeners.delete(id);
    }

    /**
     * Clears all listeners
     */
    public dispose() {
        this.listeners.forEach((handle, _) => clearInterval(handle[0]));
    }

    /**
     * Creates the UUID injected url, used for all api calls
     * @param route Route to invoke
     * @returns Configured URL
     */
    private getUrl(id: number): URL {
        const url = new URL(`${this.url}/status/${id}`);
        url.searchParams.set('uuid', this.uuid);
        return url;
    }
}