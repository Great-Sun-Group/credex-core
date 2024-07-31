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
    return false;
  }

  if (apiKeySubmitted) {
    if (apiKeySubmitted === validApiKey) {
      next();
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }
};

export default authenticate;
