import { Router, type IRouter } from "express";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import messagesRouter from "./messages";
import ordersRouter from "./orders";
import productsRouter from "./products";

const router: IRouter = Router();

router.use(authRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(messagesRouter);
router.use(dashboardRouter);

export default router;
