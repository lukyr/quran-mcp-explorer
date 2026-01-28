import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             req.headers['x-real-ip'] as string ||
             req.socket.remoteAddress ||
             'unknown';

  // Log request
  console.log(`📥 ${req.method} ${req.path}`, {
    ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response
    const emoji = statusCode >= 500 ? '❌' :
                  statusCode >= 400 ? '⚠️' :
                  statusCode >= 300 ? '↪️' : '✅';

    console.log(`${emoji} ${req.method} ${req.path} - ${statusCode} (${duration}ms)`, {
      ip,
      status: statusCode,
      duration: `${duration}ms`
    });

    // Log suspicious activity
    if (statusCode === 404 && (
      req.path.includes('wp-') ||
      req.path.includes('admin') ||
      req.path.includes('.php') ||
      req.path.includes('.env')
    )) {
      console.warn(`🚨 Suspicious 404 attempt:`, {
        ip,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
    }

    return originalSend.call(this, data);
  };

  next();
};
