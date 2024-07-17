import express from "express";
import HumanRoutes from "./Human/humanRoutes";
import AccountRoutes from "./Account/accountRoutes";
import CredexRoutes from "./Credex/credexRoutes";
import AdminRoutes from "./Admin/adminRoutes";
import { Logger } from "../config/logger";
import bodyParser from "body-parser";
import startCronJobs from "./Core/cronJobs";

const app = express();
const port = 5000;

const jsonParser = bodyParser.json();

export const apiVersionOneRoute = "/api/v1/";

app.use(Logger);

HumanRoutes(app, jsonParser);
AccountRoutes(app, jsonParser);
CredexRoutes(app, jsonParser);
AdminRoutes(app, jsonParser);

startCronJobs();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
