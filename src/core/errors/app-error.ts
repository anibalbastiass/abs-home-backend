export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorType: string;

  constructor(
      message: string,
    public readonly details?: Record<string, unknown> | Array<unknown>,
  ) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
    readonly statusCode = 404;
    readonly errorType = 'https://abshome.dev/errors/not-found';

    constructor(message = 'Resource not found', details?: Record<string, unknown>) {
        super(message, details);
    }
}

export class ValidationError extends AppError {
    readonly statusCode = 422;
    readonly errorType = 'https://abshome.dev/errors/validation-error';

    constructor(message = 'Validation failed', details?: Record<string, unknown> | Array<unknown>) {
        super(message, details);
    }
}

export class UnauthorizedError extends AppError {
    readonly statusCode = 401;
    readonly errorType = 'https://abshome.dev/errors/unauthorized';

    constructor(message = 'Authentication required', details?: Record<string, unknown>) {
        super(message, details);
    }
}

export class ForbiddenError extends AppError {
    readonly statusCode = 403;
    readonly errorType = 'https://abshome.dev/errors/forbidden';

    constructor(message = 'Access forbidden', details?: Record<string, unknown>) {
        super(message, details);
    }
}

export class RateLimitError extends AppError {
    readonly statusCode = 429;
    readonly errorType = 'https://abshome.dev/errors/rate-limit-exceeded';

    constructor(message = 'Rate limit exceeded. Please retry later.', details?: Record<string, unknown>) {
        super(message, details);
    }
}

export class VendorIntegrationError extends AppError {
    readonly statusCode = 502;
    readonly errorType = 'https://abshome.dev/errors/vendor-integration-failure';

    constructor(
    public readonly vendor: string,
    message: string,
    details?: Record<string, unknown>,
    ) {
        super(`[${vendor}] ${message}`, details);
    }
}

export class InternalServerError extends AppError {
    readonly statusCode = 500;
    readonly errorType = 'https://abshome.dev/errors/internal-server-error';

    constructor(message = 'An unexpected internal error occurred', details?: Record<string, unknown>) {
        super(message, details);
    }
}
