export class APIError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public endpoint?: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export class JSONParseError extends Error {
    constructor(
        message: string,
        public endpoint?: string,
        public responseText?: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'JSONParseError';
    }
}
