export interface StatusCallback {
    (id: number, message: string): void
}

export enum HeyGenStatusListenerMode {
    AUTO,
    SSE,
    POLL
}

/**
 * 
 */
export interface HeyGenStatusListenerOptions {
    url: string,
    mode: HeyGenStatusListenerMode,
    logging?: boolean;
    fallback?: boolean;
    pollInterval?: number;
}