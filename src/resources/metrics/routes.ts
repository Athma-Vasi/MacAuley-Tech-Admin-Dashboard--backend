import { Router } from "express";
import { productMetricRouter } from "./product/routes";

const metricsRouter = Router();

metricsRouter.use("/product", productMetricRouter);

export { metricsRouter };
