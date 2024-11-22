import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const verifyDevAdminKey = (req: Request, res: Response, next: NextFunction) => {
    const devAdminKey = req.headers['x-dev-admin-key'];
    const validKey = process.env.DEV_ADMIN_KEY;

    // Add debug logging
    logger.debug("DevAdmin auth check", {
        hasDevAdminKey: !!devAdminKey,
        hasValidKey: !!validKey,
        envKeys: Object.keys(process.env).filter(key => !key.includes('PASS') && !key.includes('SECRET')), // Log env keys but filter out sensitive ones
        headerKeys: Object.keys(req.headers)
    });

    if (!validKey) {
        logger.error("DEV_ADMIN_KEY not set in environment");
        return res.status(500).json({ message: "Server configuration error" });
    }

    if (!devAdminKey || devAdminKey !== validKey) {
        logger.warn("Invalid or missing dev admin key", {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(401).json({ message: "Unauthorized access to development admin functions" });
    }

    next();
};
