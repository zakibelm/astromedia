/**
 * Erreur de base pour toutes les erreurs API
 */
export class APIError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public endpoint?: string,
        public method?: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'APIError';

        // Maintient le stack trace correct
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            endpoint: this.endpoint,
            method: this.method,
        };
    }
}

/**
 * Erreur de parsing JSON
 */
export class JSONParseError extends APIError {
    constructor(
        message: string,
        public endpoint?: string,
        public responseText?: string,
        originalError?: unknown
    ) {
        super(message, undefined, endpoint, 'GET', originalError);
        this.name = 'JSONParseError';
    }
}

/**
 * Erreur de validation de schéma
 */
export class ValidationError extends APIError {
    constructor(
        message: string,
        public validationErrors: unknown,
        public endpoint?: string,
        originalError?: unknown
    ) {
        super(message, undefined, endpoint, undefined, originalError);
        this.name = 'ValidationError';
    }

    toJSON() {
        return {
            ...super.toJSON(),
            validationErrors: this.validationErrors,
        };
    }
}

/**
 * Erreur de timeout
 */
export class TimeoutError extends APIError {
    constructor(
        message: string,
        public timeoutMs: number,
        public endpoint?: string
    ) {
        super(message, 408, endpoint);
        this.name = 'TimeoutError';
    }
}

/**
 * Erreur réseau (pas de connexion)
 */
export class NetworkError extends APIError {
    constructor(
        message: string,
        public endpoint?: string,
        originalError?: unknown
    ) {
        super(message, undefined, endpoint, undefined, originalError);
        this.name = 'NetworkError';
    }
}
