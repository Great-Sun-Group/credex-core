import { Request, Response, NextFunction } from "express";

interface UserRequest extends Request {
  user?: any;
}

const authenticate = (req: UserRequest, res: Response, next: NextFunction) => {
  const apiKeySubmitted = req.header("whatsappBotAPIkey");
  const validApiKey = process.env.WHATSAPP_BOT_API_KEY;

  if (!validApiKey) {
    console.error(
      "WHATSAPP_BOT_API_KEY is not defined in environment variables"
    );
    return res.status(500).json({ message: "Server configuration error" });
  }

  // Request was hanging if the header was empty or did'nt have whatsappBotAPIkey in it
  if (!apiKeySubmitted) {
    console.warn("Authentication failed: API key not provided.");
    return res.status(401).json({ message: "API key is required" });
  }

  if (apiKeySubmitted === validApiKey) {
    next();
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authenticate;
