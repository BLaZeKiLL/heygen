export class ListenerNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = ListenerNotFoundError.name;
    }
}

export class MessageParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = MessageParseError.name;
    }
}

export class JobNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = JobNotFoundError.name;
    }
}

export class SSEError extends Error {
    constructor(public readonly ev: Event, message: string) {
        super(message);
        this.name = SSEError.name;
    }
}