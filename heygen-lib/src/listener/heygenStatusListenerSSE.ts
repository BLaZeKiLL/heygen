import { HeyGenStatusListener } from "./heygenStatusListener";

/**
 * 
 */
export class HeyGenStatusListenerSSE implements HeyGenStatusListener {
    private readonly source: EventSource;
    private readonly uuid: string;

    /**
     * 
     * @param url 
     * @param callback 
     * @param onerror 
     */
    constructor (
        url: string, 
        uuid: string,
    ) {
        this.source = new EventSource(url);
        this.uuid = uuid;
    }
    listen(
        id: number, 
        callback: (id: number, message: string) => void, 
        onerror?: (error: any) => void, 
        options?: any
    ): void {
        this.source.addEventListener(id.toString(), ev => {
            callback()
        })
        throw new Error("Method not implemented.");
    }

    stop(id: number): void {
        throw new Error("Method not implemented.");
    }

    /**
     * 
     */
    public dispose() {
        this.source.close();
    }
}