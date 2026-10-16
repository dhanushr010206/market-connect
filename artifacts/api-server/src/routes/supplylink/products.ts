import { Router, type IRouter } from "express";
import { and, eq, ilike } from "drizzle-orm";
import { db, producerProfiles, supplylinkProducts, supplylinkUsers } from "@workspace/db";
import {
  CreateProductBody,
  DeleteProductParams,
  GetProductsQueryParams,
  UpdateProductBody,
  UpdateProductParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "./auth";

const router: IRouter = Router();

async function productWithProducer(productId: string) {
  const [row] = await db
    .select({
      product: supplylinkProducts,
      producer: supplylinkUsers,
      profile: producerProfiles,
    })
    .from(supplylinkProducts)
    .innerJoin(supplylinkUsers, eq(supplylinkProducts.producerId, supplylinkUsers.id))
    .leftJoin(producerProfiles, eq(producerProfiles.userId, supplylinkUsers.id))
    .where(eq(supplylinkProducts.id, productId))
    .limit(1);
  if (!row) return null;
  return {
    ...row.product,
    producerName: row.profile?.businessName ?? row.producer.name,
    producerCity: row.producer.city,
    producerRating: row.profile?.rating ?? 0,
    createdAt: row.product.createdAt.toISOString(),
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = GetProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = [];
  if (parsed.data.search?.trim()) {
    const searchPattern = `%${parsed.data.search.trim()}%`;
    filters.push(ilike(supplylinkProducts.title, searchPattern));
  }
  if (parsed.data.category && parsed.data.category !== "All") {
    filters.push(eq(supplylinkProducts.category, parsed.data.category));
  }
  if (parsed.data.organic) {
    filters.push(eq(supplylinkProducts.isOrganic, true));
  }

  const rows = await db
    .select({
      product: supplylinkProducts,
      producer: supplylinkUsers,
      profile: producerProfiles,
    })
    .from(supplylinkProducts)
    .innerJoin(supplylinkUsers, eq(supplylinkProducts.producerId, supplylinkUsers.id))
    .leftJoin(producerProfiles, eq(producerProfiles.userId, supplylinkUsers.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(supplylinkProducts.createdAt);

  res.json(
    rows.map(({ product, producer, profile }) => ({
      ...product,
      producerName: profile?.businessName ?? producer.name,
      producerCity: producer.city,
      producerRating: profile?.rating ?? 0,
      createdAt: product.createdAt.toISOString(),
    })),
  );
});

router.post(
  "/products",
  requireAuth,
  requireRole("PRODUCER"),
  async (req, res): Promise<void> => {
    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [product] = await db
      .insert(supplylinkProducts)
      .values({ ...parsed.data, producerId: req.authUser!.id })
      .returning();
    if (!product) {
      res.status(500).json({ error: "Listing could not be created" });
      return;
    }
    const output = await productWithProducer(product.id);
    res.status(201).json(output);
  },
);

router.patch(
  "/products/:id",
  requireAuth,
  requireRole("PRODUCER"),
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(req.params);
    const parsed = UpdateProductBody.safeParse(req.body);
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
    const [updated] = await db
      .update(supplylinkProducts)
      .set(parsed.data)
      .where(
        and(
          eq(supplylinkProducts.id, params.data.id),
          eq(supplylinkProducts.producerId, req.authUser!.id),
        ),
      )
      .returning({ id: supplylinkProducts.id });
    if (!updated) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(await productWithProducer(updated.id));
  },
);

router.delete(
  "/products/:id",
  requireAuth,
  requireRole("PRODUCER"),
  async (req, res): Promise<void> => {
    const params = DeleteProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [deleted] = await db
      .update(supplylinkProducts)
      .set({ isActive: false })
      .where(
        and(
          eq(supplylinkProducts.id, params.data.id),
          eq(supplylinkProducts.producerId, req.authUser!.id),
        ),
      )
      .returning({ id: supplylinkProducts.id });
    if (!deleted) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
