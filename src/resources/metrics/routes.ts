import { Router } from "express";
import { financialMetricsRouter } from "./financial/routes";
import { productMetricsRouter } from "./product/routes";
import { repairMetricsRouter } from "./repair/routes";

const metricsRouter = Router();

metricsRouter.use("/product", productMetricsRouter);
metricsRouter.use("/repair", repairMetricsRouter);
metricsRouter.use("/financial", financialMetricsRouter);

export { metricsRouter };
