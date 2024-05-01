import express from "express";

export function Logger(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const today = new Date(Date.now());
  console.log(`├── [${today.toISOString()}] ROUTE[${req.originalUrl}]`);
  next();
}
