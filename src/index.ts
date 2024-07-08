import express from "express";
import AccountRoutes from "./Account/routes";
import CredexRoutes from "./Credex/routes";
import AdminRoutes from "./Admin/routes";
import { Logger } from "./config/logger";
import bodyParser from "body-parser";
import startCronJobs from "./Core/services/schedulers/cronJobs";

const app = express();
const port = 5000;

const jsonParser = bodyParser.json();

const urlencodedParser = bodyParser.urlencoded({ extended: false });

export const apiVersionOneRoute = "/api/v1/";

app.use(Logger);

AccountRoutes(app, jsonParser);
CredexRoutes(app, jsonParser);
AdminRoutes(app, jsonParser);

startCronJobs();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
