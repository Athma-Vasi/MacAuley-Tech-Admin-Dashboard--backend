import { Router } from "express";
import { customerMetricsRouter } from "./customer/routes";
import { financialMetricsRouter } from "./financial/routes";
import { productMetricsRouter } from "./product/routes";
import { repairMetricsRouter } from "./repair/routes";

const metricsRouter = Router();

metricsRouter.use("/customers", customerMetricsRouter);
metricsRouter.use("/financials", financialMetricsRouter);
metricsRouter.use("/products", productMetricsRouter);
metricsRouter.use("/repairs", repairMetricsRouter);

export { metricsRouter };
