const { ZodError } = require('zod');
const mongoose = require('mongoose');
const multer = require('multer');

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const send = (status, code, message, details) =>
    res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });

  if (err.isAppError) return send(err.status, err.code, err.message, err.details);

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return send(400, 'VALIDATION_ERROR', details[0] ? `${details[0].field ? details[0].field + ': ' : ''}${details[0].message}` : 'Invalid input', details);
  }

  if (err && (err.code === 11000 || err.code === 11001)) {
    return send(409, 'DUPLICATE', 'A record with these values already exists', err.keyValue);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return send(400, 'VALIDATION_ERROR', details[0]?.message || 'Invalid input', details);
  }
  if (err instanceof mongoose.Error.CastError) return send(400, 'BAD_REQUEST', `Invalid ${err.path}`);

  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 1 MB)' : err.message;
    return send(400, 'UPLOAD_ERROR', msg);
  }

  if (err.type === 'entity.parse.failed') return send(400, 'BAD_REQUEST', 'Malformed JSON body');
  if (err.type === 'entity.too.large') return send(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');

  // Unexpected: log server-side only, hide details from the client.
  if (process.env.NODE_ENV !== 'test') console.error('[error]', req.method, req.originalUrl, err);
  return send(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
}

module.exports = { errorHandler, notFoundHandler };
