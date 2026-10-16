import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  producerProfiles,
  supplylinkMessages,
  supplylinkOrderItems,
  supplylinkOrders,
  supplylinkProducts,
  supplylinkUsers,
} from "@workspace/db";

const DEMO_PASSWORD = "password123";

export async function seedSupplylink(): Promise<void> {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const demoUsers = [
    {
      name: "GreenValley Farms",
      email: "producer@farm.com",
      role: "PRODUCER" as const,
      address: "14 Orchard Road",
      city: "Bengaluru",
      businessName: "GreenValley Farms",
      certifications: "Organic Certified",
      latitude: 12.9716,
      longitude: 77.5946,
    },
    {
      name: "Pure Pastures Dairy",
      email: "artisan@dairy.com",
      role: "PRODUCER" as const,
      address: "8 Nandi Hills Road",
      city: "Bengaluru",
      businessName: "Pure Pastures Dairy",
      certifications: "Animal Welfare Approved",
      latitude: 13.0422,
      longitude: 77.5689,
    },
    {
      name: "FreshMart Local Supermarket",
      email: "retailer@freshmart.com",
      role: "RETAILER" as const,
      address: "102 Indiranagar Main Road",
      city: "Bengaluru",
      businessName: null,
      certifications: null,
      latitude: 12.9784,
      longitude: 77.6408,
    },
    {
      name: "Alex Johnson",
      email: "customer@gmail.com",
      role: "CUSTOMER" as const,
      address: "21 Richmond Town",
      city: "Bengaluru",
      businessName: null,
      certifications: null,
      latitude: 12.9667,
      longitude: 77.6068,
    },
  ];

  for (const demoUser of demoUsers) {
    await db
      .insert(supplylinkUsers)
      .values({
        name: demoUser.name,
        email: demoUser.email,
        password,
        role: demoUser.role,
        address: demoUser.address,
        city: demoUser.city,
        latitude: demoUser.latitude,
        longitude: demoUser.longitude,
      })
      .onConflictDoNothing();
  }

  const users = await db.select().from(supplylinkUsers);
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const farm = byEmail.get("producer@farm.com");
  const dairy = byEmail.get("artisan@dairy.com");
  const retailer = byEmail.get("retailer@freshmart.com");
  const customer = byEmail.get("customer@gmail.com");
  if (!farm || !dairy || !retailer || !customer) {
    throw new Error("SupplyLink demo users could not be seeded");
  }

  for (const [userId, businessName, certifications] of [
    [farm.id, "GreenValley Farms", "Organic Certified"],
    [dairy.id, "Pure Pastures Dairy", "Animal Welfare Approved"],
  ]) {
    await db
      .insert(producerProfiles)
      .values({ userId, businessName, certifications, minOrderValue: 0, rating: 4.8 })
      .onConflictDoNothing();
  }

  const [existingProduct] = await db
    .select({ id: supplylinkProducts.id })
    .from(supplylinkProducts)
    .limit(1);
  if (!existingProduct) {
    await db.insert(supplylinkProducts).values([
      {
        producerId: farm.id,
        title: "Organic Apples",
        description: "Crisp, sweet apples picked at peak ripeness from our hillside orchard.",
        category: "Produce",
        unit: "kg",
        retailPrice: 4.5,
        wholesalePrice: 2.8,
        moq: 25,
        stockQuantity: 420,
        imageUrl:
          "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=1100&q=85",
        isOrganic: true,
      },
      {
        producerId: dairy.id,
        title: "Farm Fresh Whole Milk",
        description: "Creamy, non-homogenized milk from pasture-raised cows. Bottled each morning.",
        category: "Dairy",
        unit: "liter",
        retailPrice: 3.2,
        wholesalePrice: 2.1,
        moq: 20,
        stockQuantity: 180,
        imageUrl:
          "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1100&q=85",
        isOrganic: true,
      },
      {
        producerId: farm.id,
        title: "Cold-Pressed Olive Oil",
        description: "Small-batch, first-press extra virgin olive oil with a bright peppery finish.",
        category: "Spices & Oil",
        unit: "liter",
        retailPrice: 18,
        wholesalePrice: 12.5,
        moq: 12,
        stockQuantity: 74,
        imageUrl:
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1100&q=85",
        isOrganic: false,
      },
      {
        producerId: farm.id,
        title: "Whole Grain Wheat",
        description: "Stone-ground whole wheat from regenerative, rain-fed fields.",
        category: "Grains",
        unit: "kg",
        retailPrice: 3.4,
        wholesalePrice: 2.2,
        moq: 50,
        stockQuantity: 680,
        imageUrl:
          "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1100&q=85",
        isOrganic: true,
      },
      {
        producerId: farm.id,
        title: "Heirloom Cherry Tomatoes",
        description: "Colorful, vine-ripened tomatoes grown without synthetic pesticides.",
        category: "Produce",
        unit: "kg",
        retailPrice: 5.8,
        wholesalePrice: 3.6,
        moq: 15,
        stockQuantity: 94,
        imageUrl:
          "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=1100&q=85",
        isOrganic: true,
      },
      {
        producerId: dairy.id,
        title: "Artisan Aged Cheddar",
        description: "Aged for 12 months in our dairy cellar for a nutty, full-bodied flavor.",
        category: "Dairy",
        unit: "kg",
        retailPrice: 22,
        wholesalePrice: 15.5,
        moq: 8,
        stockQuantity: 38,
        imageUrl:
          "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=1100&q=85",
        isOrganic: false,
      },
      {
        producerId: farm.id,
        title: "Rainbow Carrot Bunches",
        description: "Sweet, tender bunches in sunset shades, harvested fresh to order.",
        category: "Produce",
        unit: "bunch",
        retailPrice: 3.8,
        wholesalePrice: 2.4,
        moq: 20,
        stockQuantity: 11,
        imageUrl:
          "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=1100&q=85",
        isOrganic: true,
      },
    ]);
  }

  const [existingOrder] = await db
    .select({ id: supplylinkOrders.id })
    .from(supplylinkOrders)
    .limit(1);
  if (!existingOrder) {
    const [apples] = await db
      .select()
      .from(supplylinkProducts)
      .where(
        and(
          eq(supplylinkProducts.producerId, farm.id),
          eq(supplylinkProducts.title, "Organic Apples"),
        ),
      )
      .limit(1);
    const [milk] = await db
      .select()
      .from(supplylinkProducts)
      .where(
        and(
          eq(supplylinkProducts.producerId, dairy.id),
          eq(supplylinkProducts.title, "Farm Fresh Whole Milk"),
        ),
      )
      .limit(1);
    if (apples && milk) {
      const [bulkOrder] = await db
        .insert(supplylinkOrders)
        .values({
          buyerId: retailer.id,
          sellerId: farm.id,
          totalAmount: apples.wholesalePrice * 200,
          orderType: "WHOLESALE",
          status: "PROCESSING",
          deliveryAddress: retailer.address,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
        })
        .returning();
      const [milkOrder] = await db
        .insert(supplylinkOrders)
        .values({
          buyerId: customer.id,
          sellerId: dairy.id,
          totalAmount: milk.retailPrice * 4,
          orderType: "RETAIL",
          status: "DISPATCHED",
          deliveryAddress: customer.address,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        })
        .returning();
      if (bulkOrder) {
        await db.insert(supplylinkOrderItems).values({
          orderId: bulkOrder.id,
          productId: apples.id,
          quantity: 200,
          unitPrice: apples.wholesalePrice,
        });
      }
      if (milkOrder) {
        await db.insert(supplylinkOrderItems).values({
          orderId: milkOrder.id,
          productId: milk.id,
          quantity: 4,
          unitPrice: milk.retailPrice,
        });
      }
    }
  }

  const [existingMessage] = await db
    .select({ id: supplylinkMessages.id })
    .from(supplylinkMessages)
    .limit(1);
  if (!existingMessage) {
    const [apples] = await db
      .select()
      .from(supplylinkProducts)
      .where(
        and(
          eq(supplylinkProducts.producerId, farm.id),
          eq(supplylinkProducts.title, "Organic Apples"),
        ),
      )
      .limit(1);
    const messages = [
      {
        senderId: retailer.id,
        receiverId: farm.id,
        content: "We are planning next week's produce run. Could you supply 200 kg of organic apples?",
        quoteAmount: null,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30),
      },
      {
        senderId: farm.id,
        receiverId: retailer.id,
        content: "Absolutely. We have a fresh harvest ready and can deliver on Thursday morning.",
        quoteAmount: null,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28),
      },
      {
        senderId: retailer.id,
        receiverId: farm.id,
        content: "Can we make that 200 kg at $2.50/kg for the first order?",
        quoteAmount: 2.5,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
      {
        senderId: farm.id,
        receiverId: retailer.id,
        content: "That works for us. I have reserved the harvest for FreshMart.",
        quoteAmount: 2.5,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ];
    await db.insert(supplylinkMessages).values(
      messages.map((message) => ({
        ...message,
        productId: apples?.id ?? null,
      })),
    );
  }
}
