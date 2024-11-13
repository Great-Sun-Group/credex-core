import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const verifyRateLimiterBypass = (req: Request, res: Response, next: NextFunction) => {
    const skipKey = process.env.SKIP_RATE_LIMITER_KEY;
    const bypassKey = req.headers['x-skip-rate-limit'];

    if (!skipKey) {
        logger.error("SKIP_RATE_LIMITER_KEY not set in environment");
        return res.status(500).json({ message: "Server configuration error" });
    }

    if (!bypassKey || bypassKey !== skipKey) {
        logger.warn("Invalid or missing rate limiter bypass key", {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(401).json({ message: "Rate limiter bypass not authorized" });
    }

    logger.debug("Rate limiter bypass authorized", {
        path: req.path,
        method: req.method
    });

    next();
};
