import { Router, type IRouter } from "express";
import { and, count, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import {
  db,
  supplylinkMessages,
  supplylinkOrders,
  supplylinkProducts,
} from "@workspace/db";
import { requireAuth, requireRole } from "./auth";

const router: IRouter = Router();
const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "PROCESSING", "DISPATCHED"] as const;

router.get(
  "/dashboard/summary",
  requireAuth,
  requireRole("PRODUCER"),
  async (req, res): Promise<void> => {
    const producerId = req.authUser!.id;
    const [revenueResult] = await db
      .select({
        revenue: sql<number>`coalesce(sum(${supplylinkOrders.totalAmount}), 0)`,
      })
      .from(supplylinkOrders)
      .where(
        and(
          eq(supplylinkOrders.sellerId, producerId),
          sql`${supplylinkOrders.status} <> 'CANCELLED'`,
        ),
      );
    const [activeResult] = await db
      .select({ value: count() })
      .from(supplylinkOrders)
      .where(
        and(
          eq(supplylinkOrders.sellerId, producerId),
          inArray(supplylinkOrders.status, [...ACTIVE_STATUSES]),
        ),
      );
    const [lowStockResult] = await db
      .select({ value: count() })
      .from(supplylinkProducts)
      .where(
        and(
          eq(supplylinkProducts.producerId, producerId),
          lt(supplylinkProducts.stockQuantity, 20),
        ),
      );
    const [inquiriesResult] = await db
      .select({ value: count() })
      .from(supplylinkMessages)
      .where(
        and(
          eq(supplylinkMessages.receiverId, producerId),
          gt(
            supplylinkMessages.timestamp,
            new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
          ),
        ),
      );

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const salesRows = await db
      .select({
        totalAmount: supplylinkOrders.totalAmount,
        createdAt: supplylinkOrders.createdAt,
      })
      .from(supplylinkOrders)
      .where(
        and(
          eq(supplylinkOrders.sellerId, producerId),
          gte(supplylinkOrders.createdAt, sixMonthsAgo),
          sql`${supplylinkOrders.status} <> 'CANCELLED'`,
        ),
      )
      .orderBy(desc(supplylinkOrders.createdAt));

    const months = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(sixMonthsAgo);
      month.setMonth(sixMonthsAgo.getMonth() + index);
      return {
        key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
        month: month.toLocaleString("en", { month: "short" }),
        sales: 0,
      };
    });
    const monthByKey = new Map(months.map((month) => [month.key, month]));
    for (const row of salesRows) {
      const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const month = monthByKey.get(key);
      if (month) month.sales += row.totalAmount;
    }

    res.json({
      revenue: Number(revenueResult?.revenue ?? 0),
      activeOrders: Number(activeResult?.value ?? 0),
      pendingInquiries: Number(inquiriesResult?.value ?? 0),
      lowStockCount: Number(lowStockResult?.value ?? 0),
      sales: months.map(({ month, sales }) => ({ month, sales })),
    });
  },
);

export default router;
