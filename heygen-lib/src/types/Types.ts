/**
 * callback for jobs status
 */
export interface StatusCallback {
    (id: number, message: string): void
}

/**
 * Which internal backend to use for status listening
 */
export enum HeyGenStatusListenerMode {
    /**
     * AUTO resolves to SSE if the platform supports it else resolves to POLL
     */
    AUTO,

    /**
     * Uses Server side events for listening to job status
     */
    SSE,

    /**
     * Uses polling based on poll interval to fetch job status
     */
    POLL
}

/**
 * Options to interact with the HeyGen API
 */
export interface HeyGenAPIOptions {
    /**
     * Base url for the Heygen api
     */
    url: string,

    /**
     * Status listener mode,
     * @default HeyGenStatusListenerMode.AUTO
     */
    mode: HeyGenStatusListenerMode,

    /**
     * Enable logging
     * @default false
     */
    logging?: boolean;

    /**
     * Enable SSE fallback to POLL on disconnection
     * @default false
     */
    fallback?: boolean;

    /**
     * Polling interval for POLL, control your cost
     */
    pollInterval?: number;
}