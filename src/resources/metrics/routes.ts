import { Router } from "express";
import { productMetricsRouter } from "./product/routes";
import { repairMetricsRouter } from "./repair/routes";

const metricsRouter = Router();

metricsRouter.use("/product", productMetricsRouter);
metricsRouter.use("/repair", repairMetricsRouter);

export { metricsRouter };
