export const validate = (schema, selector = 'body') => (req, res, next) => {
  const parsed = schema.safeParse(req[selector]);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request payload.',
      details: parsed.error.flatten()
    });
  }

  req[selector] = parsed.data;
  return next();
};
