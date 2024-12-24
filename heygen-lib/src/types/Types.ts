export interface StatusCallback {
    (id: number, message: string): void
}

export enum HeyGenStatusListenerMode {
    SSE,
    POLL
}

/**
 * 
 */
export interface HeyGenStatusListenerOptions {
    url: string,
    mode?: HeyGenStatusListenerMode,
    fallback?: boolean;
    pollInterval?: number;
}