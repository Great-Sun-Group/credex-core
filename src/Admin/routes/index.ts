import express from "express";
import { apiVersionOneRoute } from "../..";
import { ClearDevDbController } from "../controllers/ClearDevDbController";
import { ForceDcoController } from "../controllers/ForceDcoController";
import { ForceMtqController } from "../controllers/ForceMtqController";

export default function AdminRoutes(
    app: express.Application,
    jsonParser: any
) {

    app.delete(
        `${apiVersionOneRoute}clearDevDB`,
        jsonParser,
        ClearDevDbController
    );

    app.post(
        `${apiVersionOneRoute}forceDCO`,
        jsonParser,
        ForceDcoController
    )
    app.post(
        `${apiVersionOneRoute}forceMTQ`,
        jsonParser,
        ForceMtqController
    )

}
