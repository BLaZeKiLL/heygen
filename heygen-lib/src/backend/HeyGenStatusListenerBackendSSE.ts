import { ListenerNotFoundError } from "../errors/Errors";
import { StatusCallback } from "../types/Types";
import { IHeyGenStatusListenerBackend } from "./HeyGenStatusListenerBackend";

/**
 * 
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
        this.source = new EventSource(this.url);
        this.listeners = new Map();

        this.source.onerror = this.onerror;
    }

    jobs(): [number, StatusCallback][] {
        return Array.from(this.listeners.keys()).map(x => ([x, this.listeners.get(x)![1]]));
    }
    
    public listen(
        id: number, 
        callback: StatusCallback, 
        _options?: any
    ): void {
        let cb = (ev: MessageEvent) => {
            callback(ev.data.id, ev.data.message);
        }

        this.source.addEventListener(id.toString(), cb);

        this.listeners.set(id, [cb, callback]);
    }

    public stop(id: number): void {
        if (!this.listeners.has(id)) {
            throw new ListenerNotFoundError(`Job with ID: ${id} is not being listened`);
        }

        let cb : (ev: MessageEvent) => void = this.listeners.get(id)![0];

        this.source.removeEventListener(id.toString(), cb);

        this.listeners.delete(id);
    }

    /**
     * 
     */
    public dispose() {
        this.source.close();
    }
}