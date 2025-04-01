import { Router } from "express";
import { customerMetricsRouter } from "./customer/routes";
import { financialMetricsRouter } from "./financial/routes";
import { productMetricsRouter } from "./product/routes";
import { repairMetricsRouter } from "./repair/routes";

const metricsRouter = Router();

metricsRouter.use("/customer", customerMetricsRouter);
metricsRouter.use("/financial", financialMetricsRouter);
metricsRouter.use("/product", productMetricsRouter);
metricsRouter.use("/repair", repairMetricsRouter);

export { metricsRouter };
