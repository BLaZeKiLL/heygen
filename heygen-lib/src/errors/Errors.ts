/**
 * This error happens when the user tries to stop a listener
 * which hasn't been registered
 */
export class ListenerNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = ListenerNotFoundError.name;
    }
}

/**
 * This error happens when the internal backend fails to JSON
 * parse the incoming message
 */
export class MessageParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = MessageParseError.name;
    }
}

/**
 * This error happens when the user tries to fetch the status of
 * a job that doesn't exist or the user is not authorized to
 * view on the backend
 */
export class JobNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = JobNotFoundError.name;
    }
}

/**
 * This error wraps all the SSE connection related errors
 */
export class SSEError extends Error {
    constructor(public readonly ev: Event, message: string) {
        super(message);
        this.name = SSEError.name;
    }
}