const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

const skipInDev = () => !isProduction;

const createLimiter = ({ windowMs = 15 * 60 * 1000, max, message }) =>
  rateLimit({
    windowMs,
    max: isProduction ? max : 10_000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDev,
    message: { message },
  });

const globalLimiter = createLimiter({
  max: 500,
  message: 'Too many requests. Please try again later.',
});

const authLimiter = createLimiter({
  max: 30,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
});

const sensitiveLimiter = createLimiter({
  max: 10,
  message: 'Too many attempts. Please try again later.',
});

const masterPasswordLimiter = createLimiter({
  max: 20,
  message: 'Too many master password attempts. Please try again later.',
});

module.exports = {
  globalLimiter,
  authLimiter,
  sensitiveLimiter,
  masterPasswordLimiter,
};
