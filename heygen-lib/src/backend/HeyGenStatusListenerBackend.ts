import { StatusCallback } from "../types/Types";

export interface IHeyGenStatusListenerBackend {
    listen(id: number, 
        callback: StatusCallback, 
        options?: any
    ): void;
    jobs(): [number, StatusCallback][];
    stop(id: number): void;
    dispose(): void;
}