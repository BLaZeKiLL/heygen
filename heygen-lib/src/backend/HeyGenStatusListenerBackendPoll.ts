import { JobNotFoundError, ListenerNotFoundError } from "../errors/Errors";
import { StatusCallback } from "../types/Types";
import { IHeyGenStatusListenerBackend } from "./HeyGenStatusListenerBackend";

export class HeyGenStatusListenerBackendPoll implements IHeyGenStatusListenerBackend {
    private readonly listeners: Map<number, [NodeJS.Timeout, StatusCallback]>;

    /**
     * 
     * @param url 
     */
    constructor (
        private readonly url: string,
        private readonly uuid: string,
    ) {
        this.listeners = new Map();
    }

    jobs(): [number, StatusCallback][] {
        return Array.from(this.listeners.keys()).map(x => ([x, this.listeners.get(x)![1]]));
    }

    /**
     * 
     * @param id 
     * @param callback 
     * @param options 
     */
    public listen(id: number, callback: StatusCallback, options?: any): void {
        this.listeners.set(id, [setInterval(async () => {
            try {
                let response = await fetch(`${this.url}/${id}?${this.uuid}`);

                if (response.status === 404) {
                    throw new JobNotFoundError(`Job with ID: ${id} was not found on the server`);
                } else {
                    let result = await response.json();
                    callback(result.id, result.message);
                }
            } catch (error) {
                throw error;
            }
        }, options.interval ?? 1000), callback]);
    }

    /**
     * 
     * @param id 
     */
    public stop(id: number) {
        if (!this.listeners.has(id)) {
            throw new ListenerNotFoundError(`Job with ID: ${id} is not being listened`);
        }

        clearInterval(this.listeners.get(id)![0]);
        this.listeners.delete(id);
    }

    /**
     * 
     */
    public dispose() {
        this.listeners.forEach((handle, _) => clearInterval(handle[0]));
    }
}