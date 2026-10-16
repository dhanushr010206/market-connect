import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import {
  db,
  supplylinkMessages,
  supplylinkProducts,
  supplylinkUsers,
} from "@workspace/db";
import {
  GetMessagesParams,
  SendMessageBody,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/messages/threads", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const messages = await db
    .select()
    .from(supplylinkMessages)
    .where(
      or(
        eq(supplylinkMessages.senderId, userId),
        eq(supplylinkMessages.receiverId, userId),
      ),
    )
    .orderBy(desc(supplylinkMessages.timestamp));
  const counterpartIds = [
    ...new Set(
      messages.map((message) =>
        message.senderId === userId ? message.receiverId : message.senderId,
      ),
    ),
  ];
  if (counterpartIds.length === 0) {
    res.json([]);
    return;
  }

  const users = await db
    .select()
    .from(supplylinkUsers)
    .where(inArray(supplylinkUsers.id, counterpartIds));
  const userById = new Map(users.map((user) => [user.id, user]));
  const latestByUser = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    const otherId =
      message.senderId === userId ? message.receiverId : message.senderId;
    if (!latestByUser.has(otherId)) latestByUser.set(otherId, message);
  }

  res.json(
    [...latestByUser.entries()]
      .map(([otherId, message]) => {
        const other = userById.get(otherId);
        if (!other) return null;
        return {
          userId: other.id,
          name: other.name,
          role: other.role,
          lastMessage:
            message.quoteAmount == null
              ? message.content
              : `Price quote: $${message.quoteAmount.toFixed(2)}`,
          timestamp: message.timestamp.toISOString(),
          unread: 0,
        };
      })
      .filter((thread) => thread !== null),
  );
});

router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const params = GetMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const currentId = req.authUser!.id;
  const otherId = params.data.userId;
  const messages = await db
    .select()
    .from(supplylinkMessages)
    .where(
      or(
        and(
          eq(supplylinkMessages.senderId, currentId),
          eq(supplylinkMessages.receiverId, otherId),
        ),
        and(
          eq(supplylinkMessages.senderId, otherId),
          eq(supplylinkMessages.receiverId, currentId),
        ),
      ),
    )
    .orderBy(supplylinkMessages.timestamp);
  const users = await db
    .select({ id: supplylinkUsers.id, name: supplylinkUsers.name })
    .from(supplylinkUsers)
    .where(inArray(supplylinkUsers.id, [currentId, otherId]));
  const nameById = new Map(users.map((user) => [user.id, user.name]));
  res.json(
    messages.map((message) => ({
      ...message,
      senderName: nameById.get(message.senderId) ?? "SupplyLink user",
      timestamp: message.timestamp.toISOString(),
    })),
  );
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.receiverId === req.authUser!.id) {
    res.status(400).json({ error: "You cannot send a message to yourself" });
    return;
  }
  const [receiver] = await db
    .select({ id: supplylinkUsers.id })
    .from(supplylinkUsers)
    .where(eq(supplylinkUsers.id, parsed.data.receiverId))
    .limit(1);
  if (!receiver) {
    res.status(404).json({ error: "Recipient not found" });
    return;
  }
  if (parsed.data.productId) {
    const [product] = await db
      .select({ id: supplylinkProducts.id })
      .from(supplylinkProducts)
      .where(eq(supplylinkProducts.id, parsed.data.productId))
      .limit(1);
    if (!product) {
      res.status(404).json({ error: "Related listing not found" });
      return;
    }
  }

  const [message] = await db
    .insert(supplylinkMessages)
    .values({
      senderId: req.authUser!.id,
      receiverId: parsed.data.receiverId,
      productId: parsed.data.productId ?? null,
      content: parsed.data.content,
      quoteAmount: parsed.data.quoteAmount ?? null,
    })
    .returning();
  if (!message) {
    res.status(500).json({ error: "Message could not be sent" });
    return;
  }
  const [sender] = await db
    .select({ name: supplylinkUsers.name })
    .from(supplylinkUsers)
    .where(eq(supplylinkUsers.id, message.senderId))
    .limit(1);
  res.status(201).json({
    ...message,
    senderName: sender?.name ?? "SupplyLink user",
    timestamp: message.timestamp.toISOString(),
  });
});

export default router;
