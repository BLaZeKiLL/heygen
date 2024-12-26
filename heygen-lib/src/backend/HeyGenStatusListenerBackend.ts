import { StatusCallback } from "../types/Types";

/**
 * Internal backend listeners implement this interface
 */
export interface IHeyGenStatusListenerBackend {
    /**
     * Subscribe to the status of a job
     * @param id ID of the job to listen
     * @param callback Callback to be invoked on status messages
     * @param options API options
     */
    listen(id: number, 
        callback: StatusCallback, 
        options?: any
    ): void;

    /**
     * @returns tuple array of job id's and callbacks
     */
    jobs(): [number, StatusCallback][];

    /**
     * Stop listening for a job
     * @param id ID of the job to stop listening
     */
    stop(id: number): void;

    /**
     * Clears all listeners
     */
    dispose(): void;
}