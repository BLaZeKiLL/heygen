const uuid = crypto.randomUUID();



export class HeyGenStatusPoller {
    private handles: Map<number, NodeJS.Timeout>;

    /**
     * 
     * @param url 
     */
    constructor (private readonly url: string) {
        this.handles = new Map();
    }

    /**
     * 
     * @param id 
     * @param callback 
     * @param onerror 
     * @param interval 
     */
    public poll(
        id: number, 
        callback: (id: number, message: string) => void, 
        onerror?: (error: any) => void, 
        interval = 1000
    ) {
        this.handles.set(id, setInterval(async () => {
            try {
                let response = await fetch(`${this.url}/${id}`);

                if (response.status === 404) {
                    if (onerror !== null && onerror !== undefined) {
                        onerror('Job not found');
                    }
                } else {
                    let result = await response.json();
                    callback(result.id, result.message);
                }
            } catch (error) {
                if (onerror !== null && onerror !== undefined) {
                    onerror(error);
                }
            }
        }, interval));
    }

    /**
     * 
     * @param id 
     */
    public stop(id: number) {
        clearInterval(this.handles.get(id));
        this.handles.delete(id);
    }

    /**
     * 
     */
    public dispose() {
        this.handles.forEach((handle, _) => clearInterval(handle));
    }
}
