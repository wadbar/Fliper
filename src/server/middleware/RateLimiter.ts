
import rateLimit from 'express-rate-limit';

/**
 * KERNEL RATE LIMITER
 * Prevents rapid-fire command injection and resource exhaustion.
 */
export const kernelRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "Kernel is processing too many requests from this sector. Cool down initiated."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "AUTH_THROTTLED", message: "Too many failed attempts. Identity verification frozen." }
});
