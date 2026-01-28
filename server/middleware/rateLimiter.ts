import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blocked: boolean;
    blockUntil?: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Max requests per window
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now && !store[key].blocked) {
      delete store[key];
    }
    // Unblock IPs after block duration
    if (store[key].blocked && store[key].blockUntil && store[key].blockUntil! < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Get client IP (handle proxy headers)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             req.headers['x-real-ip'] as string ||
             req.socket.remoteAddress ||
             'unknown';

  const now = Date.now();

  // Initialize or get existing record
  if (!store[ip]) {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS,
      blocked: false
    };
    return next();
  }

  const record = store[ip];

  // Check if IP is blocked
  if (record.blocked && record.blockUntil && record.blockUntil > now) {
    console.warn(`🚫 Blocked IP attempting access: ${ip}`);
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((record.blockUntil - now) / 1000)
    });
  }

  // Reset if window expired
  if (record.resetTime < now) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    record.blocked = false;
    delete record.blockUntil;
    return next();
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  if (record.count > MAX_REQUESTS) {
    record.blocked = true;
    record.blockUntil = now + BLOCK_DURATION;
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip} (${record.count} requests)`);

    return res.status(429).json({
      error: 'Too many requests. Your IP has been temporarily blocked.',
      retryAfter: Math.ceil(BLOCK_DURATION / 1000)
    });
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', (MAX_REQUESTS - record.count).toString());
  res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

  next();
};

// Stricter rate limit for API endpoints
export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             req.headers['x-real-ip'] as string ||
             req.socket.remoteAddress ||
             'unknown';

  const apiKey = `api_${ip}`;
  const now = Date.now();
  const API_WINDOW_MS = 60 * 1000; // 1 minute
  const API_MAX_REQUESTS = 20; // Max 20 requests per minute for API

  if (!store[apiKey]) {
    store[apiKey] = {
      count: 1,
      resetTime: now + API_WINDOW_MS,
      blocked: false
    };
    return next();
  }

  const record = store[apiKey];

  if (record.resetTime < now) {
    record.count = 1;
    record.resetTime = now + API_WINDOW_MS;
    return next();
  }

  record.count++;

  if (record.count > API_MAX_REQUESTS) {
    console.warn(`⚠️ API rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: 'API rate limit exceeded. Please slow down.',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  res.setHeader('X-RateLimit-Limit', API_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', (API_MAX_REQUESTS - record.count).toString());

  next();
};
