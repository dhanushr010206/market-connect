import { Router, type IRouter } from "express";
import healthRouter from "./health";
import supplylinkRouter from "./supplylink";

const router: IRouter = Router();

router.use(healthRouter);
router.use(supplylinkRouter);

export default router;
