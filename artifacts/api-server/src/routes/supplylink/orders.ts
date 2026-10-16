import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  supplylinkOrderItems,
  supplylinkOrders,
  supplylinkProducts,
  supplylinkUsers,
} from "@workspace/db";
import {
  CreateOrderBody,
  UpdateOrderStatusBody,
  UpdateOrderStatusParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

class OrderProblem extends Error {}

async function serializeOrder(orderId: string) {
  const [order] = await db
    .select()
    .from(supplylinkOrders)
    .where(eq(supplylinkOrders.id, orderId))
    .limit(1);
  if (!order) return null;

  const [buyer] = await db
    .select({ name: supplylinkUsers.name })
    .from(supplylinkUsers)
    .where(eq(supplylinkUsers.id, order.buyerId))
    .limit(1);
  const [seller] = await db
    .select({ name: supplylinkUsers.name })
    .from(supplylinkUsers)
    .where(eq(supplylinkUsers.id, order.sellerId))
    .limit(1);
  const lines = await db
    .select({
      id: supplylinkOrderItems.id,
      productId: supplylinkOrderItems.productId,
      quantity: supplylinkOrderItems.quantity,
      unitPrice: supplylinkOrderItems.unitPrice,
      title: supplylinkProducts.title,
      imageUrl: supplylinkProducts.imageUrl,
      unit: supplylinkProducts.unit,
    })
    .from(supplylinkOrderItems)
    .innerJoin(
      supplylinkProducts,
      eq(supplylinkProducts.id, supplylinkOrderItems.productId),
    )
    .where(eq(supplylinkOrderItems.orderId, order.id));

  return {
    ...order,
    buyerName: buyer?.name ?? "Buyer",
    sellerName: seller?.name ?? "Producer",
    createdAt: order.createdAt.toISOString(),
    items: lines,
  };
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  const records =
    user.role === "PRODUCER"
      ? await db
          .select({ id: supplylinkOrders.id })
          .from(supplylinkOrders)
          .where(eq(supplylinkOrders.sellerId, user.id))
          .orderBy(desc(supplylinkOrders.createdAt))
      : await db
          .select({ id: supplylinkOrders.id })
          .from(supplylinkOrders)
          .where(eq(supplylinkOrders.buyerId, user.id))
          .orderBy(desc(supplylinkOrders.createdAt));
  const orders = await Promise.all(records.map((record) => serializeOrder(record.id)));
  res.json(orders.filter((order) => order !== null));
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (req.authUser!.role === "PRODUCER") {
    res.status(403).json({ error: "Producer accounts cannot place buyer orders" });
    return;
  }

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  try {
    const createdOrderIds = await db.transaction(async (tx) => {
      const productIds = [...quantities.keys()];
      const products = await tx
        .select()
        .from(supplylinkProducts)
        .where(inArray(supplylinkProducts.id, productIds))
        .for("update");
      const productById = new Map(products.map((product) => [product.id, product]));
      const groups = new Map<
        string,
        { totalAmount: number; lines: { product: (typeof products)[number]; quantity: number; unitPrice: number }[] }
      >();

      for (const [productId, quantity] of quantities) {
        const product = productById.get(productId);
        if (!product) throw new OrderProblem("A selected listing is no longer available");
        if (!product.isActive) {
          throw new OrderProblem(`${product.title} is no longer available`);
        }
        if (quantity > product.stockQuantity) {
          throw new OrderProblem(`${product.title} has only ${product.stockQuantity} ${product.unit} available`);
        }
        if (parsed.data.orderType === "WHOLESALE" && quantity < product.moq) {
          throw new OrderProblem(`${product.title} requires a minimum wholesale order of ${product.moq} ${product.unit}`);
        }
        const unitPrice =
          parsed.data.orderType === "WHOLESALE"
            ? product.wholesalePrice
            : product.retailPrice;
        const group = groups.get(product.producerId) ?? { totalAmount: 0, lines: [] };
        group.totalAmount += unitPrice * quantity;
        group.lines.push({ product, quantity, unitPrice });
        groups.set(product.producerId, group);
      }

      if (groups.size === 0) throw new OrderProblem("Your cart is empty");
      const createdIds: string[] = [];
      for (const [sellerId, group] of groups) {
        const [created] = await tx
          .insert(supplylinkOrders)
          .values({
            buyerId: req.authUser!.id,
            sellerId,
            totalAmount: group.totalAmount,
            orderType: parsed.data.orderType,
            deliveryAddress: parsed.data.deliveryAddress,
          })
          .returning({ id: supplylinkOrders.id });
        if (!created) throw new Error("Order could not be created");
        createdIds.push(created.id);

        for (const line of group.lines) {
          await tx.insert(supplylinkOrderItems).values({
            orderId: created.id,
            productId: line.product.id,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          });
          await tx
            .update(supplylinkProducts)
            .set({ stockQuantity: line.product.stockQuantity - line.quantity })
            .where(eq(supplylinkProducts.id, line.product.id));
        }
      }
      return createdIds;
    });

    res.status(201).json(
      (await Promise.all(createdOrderIds.map((id) => serializeOrder(id)))).filter(
        (order) => order !== null,
      ),
    );
  } catch (error) {
    if (error instanceof OrderProblem) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.patch(
  "/orders/:id/status",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateOrderStatusParams.safeParse(req.params);
    const parsed = UpdateOrderStatusBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({
        error: !params.success
          ? params.error.message
          : !parsed.success
            ? parsed.error.message
            : "Invalid request",
      });
      return;
    }

    const [existing] = await db
      .select()
      .from(supplylinkOrders)
      .where(eq(supplylinkOrders.id, params.data.id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const producerUpdate =
      req.authUser!.role === "PRODUCER" &&
      existing.sellerId === req.authUser!.id;
    const buyerCancellation =
      existing.buyerId === req.authUser!.id &&
      existing.status === "PENDING" &&
      parsed.data.status === "CANCELLED";
    if (!producerUpdate && !buyerCancellation) {
      res.status(403).json({ error: "You cannot update this order" });
      return;
    }

    const [updated] = await db
      .update(supplylinkOrders)
      .set({ status: parsed.data.status })
      .where(eq(supplylinkOrders.id, params.data.id))
      .returning({ id: supplylinkOrders.id });
    if (!updated) {
      res.status(404).json({ error: "Incoming order not found" });
      return;
    }
    res.json(await serializeOrder(updated.id));
  },
);

export default router;
