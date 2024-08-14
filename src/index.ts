import express from "express";
import MemberRoutes from "./Member/memberRoutes";
import AccountRoutes from "./Account/accountRoutes";
import CredexRoutes from "./Credex/credexRoutes";
import AdminRoutes from "./Admin/adminRoutes";
import { Logger } from "../config/logger";
import bodyParser from "body-parser";
import startCronJobs from "./Core/cronJobs";
import authenticate from "../config/authenticate";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const port = 5000;

const jsonParser = bodyParser.json();

export const apiVersionOneRoute = "/api/v1/";

app.use(helmet());
app.use(cors());
app.use(Logger);
app.use(apiVersionOneRoute, authenticate);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

startCronJobs();
MemberRoutes(app, jsonParser);
AccountRoutes(app, jsonParser);
CredexRoutes(app, jsonParser);

if (process.env.DEPLOYMENT === "demo") {
  AdminRoutes(app, jsonParser);
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
