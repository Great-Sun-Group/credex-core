import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const verifyRateLimiterBypass = (req: Request, res: Response, next: NextFunction) => {
    const bypassKey = req.headers['x-skip-rate-limit'];
    const validKey = process.env.SKIP_RATE_LIMITER_KEY;

    // Add debug logging similar to devAdminAuth
    logger.debug("Rate limiter bypass check", {
        hasBypassKey: !!bypassKey,
        hasValidKey: !!validKey,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    // Ensure the key is configured
    if (!validKey) {
        logger.error("SKIP_RATE_LIMITER_KEY not set in environment", {
            path: req.path,
            method: req.method
        });
        return res.status(500).json({ message: "Server configuration error" });
    }

    // Block usage in production
    if (process.env.NODE_ENV === 'production') {
        logger.warn("Attempted to use rate limiter bypass in production", {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(403).json({ message: "Rate limiter bypass not allowed in production" });
    }

    // Verify the bypass key
    if (!bypassKey || bypassKey !== validKey) {
        logger.warn("Invalid or missing rate limiter bypass key", {
            path: req.path,
            method: req.method,
            ip: req.ip,
            hasKey: !!bypassKey
        });
        return res.status(401).json({ message: "Rate limiter bypass not authorized" });
    }

    // Log successful bypass
    logger.debug("Rate limiter bypass authorized", {
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    next();
};
