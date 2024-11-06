import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const verifyClientApiKey = (req: Request, res: Response, next: NextFunction) => {
    const clientApiKey = req.headers['x-client-api-key'];
    const validApiKey = process.env.CLIENT_API_KEY;

    if (!validApiKey) {
        logger.error("CLIENT_API_KEY not set in environment");
        return res.status(500).json({ message: "Server configuration error" });
    }

    if (!clientApiKey || clientApiKey !== validApiKey) {
        logger.warn("Invalid or missing client API key", {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        return res.status(401).json({ message: "Unauthorized client" });
    }

    next();
};
