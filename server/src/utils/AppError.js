export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMessages = {
  notFound: (resource) => `${resource} not found`,
  unauthorized: 'Please log in to continue',
  forbidden: 'You do not have permission to perform this action',
  invalidToken: 'Invalid or expired token',
};
