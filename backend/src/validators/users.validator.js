const { z } = require('zod');

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1)
});

exports.createUserValidator = (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  next();
};