export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
};

export const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    error: error.message || 'Internal server error.'
  });
};
