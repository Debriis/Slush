export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const requireCondition = (condition, status, message) => {
  if (!condition) throw new ApiError(status, message);
};

export function errorHandler(error, _req, res, _next) {
  if (error.name === 'ZodError')
    return res.status(400).json({
      error: {
        message: 'Please check the form fields.',
        fields: error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    });
  if (error.code === 'P2002')
    return res.status(409).json({ error: { message: 'This record already exists.' } });
  if (error.code === 'P2025')
    return res.status(404).json({ error: { message: 'Record not found.' } });
  if (error.code === 'P2003')
    return res.status(400).json({ error: { message: 'A referenced record does not exist.' } });
  const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
  // Deliberately never log request bodies, bearer tokens, database URLs, or raw provider errors.
  if (status >= 500 && process.env.NODE_ENV === 'development')
    console.error('Request failed:', error.name || 'Error');
  return res.status(status).json({
    error: {
      message:
        status < 500 && error instanceof ApiError
          ? error.message
          : status === 400
            ? 'Invalid request.'
            : 'Something went wrong. Please try again.',
    },
  });
}
