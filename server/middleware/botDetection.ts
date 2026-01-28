import { Request, Response, NextFunction } from 'express';

// Common bot user agents
const BOT_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
  'scrapy', 'httpclient', 'okhttp', 'go-http-client', 'java/', 'apache-httpclient',
  'headless', 'phantom', 'selenium', 'webdriver', 'puppeteer', 'playwright',
  'scanner', 'nikto', 'sqlmap', 'nmap', 'masscan', 'nessus', 'openvas',
  'metasploit', 'burp', 'zap', 'acunetix', 'w3af', 'skipfish'
];

// Suspicious paths that bots commonly try
const SUSPICIOUS_PATHS = [
  '/wp-admin', '/wordpress', '/wp-login', '/admin', '/phpmyadmin',
  '/setup', '/install', '/config', '/.env', '/.git', '/backup',
  '/sql', '/database', '/db', '/phpinfo', '/test', '/shell'
];

// Required browser headers
const BROWSER_HEADERS = ['accept-language', 'accept-encoding'];

export const botDetection = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const path = req.path.toLowerCase();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             req.headers['x-real-ip'] as string ||
             req.socket.remoteAddress ||
             'unknown';

  // Check 1: Suspicious User-Agent
  const isSuspiciousUA = BOT_USER_AGENTS.some(bot => userAgent.includes(bot));

  // Check 2: Missing User-Agent (very suspicious)
  const hasNoUA = !req.headers['user-agent'];

  // Check 3: Accessing suspicious paths
  const isSuspiciousPath = SUSPICIOUS_PATHS.some(suspPath => path.includes(suspPath));

  // Check 4: Missing common browser headers
  const missingBrowserHeaders = BROWSER_HEADERS.some(header => !req.headers[header]);

  // Check 5: Empty or suspicious Accept header
  const acceptHeader = req.headers['accept'] || '';
  const hasNoAccept = !acceptHeader || acceptHeader === '*/*';

  // Calculate suspicion score
  let suspicionScore = 0;
  if (isSuspiciousUA) suspicionScore += 3;
  if (hasNoUA) suspicionScore += 4;
  if (isSuspiciousPath) suspicionScore += 5;
  if (missingBrowserHeaders) suspicionScore += 2;
  if (hasNoAccept) suspicionScore += 1;

  // Block if suspicion score is high
  if (suspicionScore >= 5) {
    console.warn(`🤖 Bot detected and blocked:`, {
      ip,
      userAgent: req.headers['user-agent'],
      path,
      suspicionScore,
      reasons: {
        suspiciousUA: isSuspiciousUA,
        noUA: hasNoUA,
        suspiciousPath: isSuspiciousPath,
        missingHeaders: missingBrowserHeaders,
        noAccept: hasNoAccept
      }
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'Automated access is not allowed'
    });
  }

  // Log suspicious but not blocked
  if (suspicionScore >= 3) {
    console.warn(`⚠️ Suspicious request (score: ${suspicionScore}):`, {
      ip,
      userAgent: req.headers['user-agent'],
      path
    });
  }

  next();
};

// Whitelist specific good bots (Google, Bing, etc.)
export const allowGoodBots = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();

  const GOOD_BOTS = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegram', 'discord'
  ];

  const isGoodBot = GOOD_BOTS.some(bot => userAgent.includes(bot));

  if (isGoodBot) {
    // Skip bot detection for good bots
    return next();
  }

  // Continue to bot detection
  botDetection(req, res, next);
};
