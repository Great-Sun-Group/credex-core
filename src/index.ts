import express from "express";
import WhatsAppClientRoutes from "./WhatsAppClient/routes";
import { Logger } from "./config/logger";

const app = express();
const port = 8000;

export const apiVersionOneRoute = "/api/v1/";

app.use(Logger);

WhatsAppClientRoutes(app);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
