class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.isAppError = true;
  }
}

const badRequest = (msg, details, code = 'BAD_REQUEST') => new AppError(400, code, msg, details);
const unauthorized = (msg = 'Authentication required') => new AppError(401, 'UNAUTHENTICATED', msg);
const forbidden = (msg = 'You do not have access to this resource') => new AppError(403, 'FORBIDDEN', msg);
const notFound = (msg = 'Not found') => new AppError(404, 'NOT_FOUND', msg);
const conflict = (msg, details, code = 'CONFLICT') => new AppError(409, code, msg, details);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
