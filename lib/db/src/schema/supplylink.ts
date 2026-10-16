import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const supplylinkRole = pgEnum("supplylink_role", [
  "PRODUCER",
  "RETAILER",
  "CUSTOMER",
]);
export const supplylinkOrderType = pgEnum("supplylink_order_type", [
  "WHOLESALE",
  "RETAIL",
]);
export const supplylinkOrderStatus = pgEnum("supplylink_order_status", [
  "PENDING",
  "ACCEPTED",
  "PROCESSING",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
]);

export const supplylinkUsers = pgTable(
  "supplylink_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    role: supplylinkRole("role").notNull(),
    phone: text("phone"),
    address: text("address").notNull(),
    city: text("city").notNull(),
    latitude: real("latitude").notNull().default(12.9716),
    longitude: real("longitude").notNull().default(77.5946),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("supplylink_users_email_idx").on(table.email)],
);

export const producerProfiles = pgTable(
  "supplylink_producer_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => supplylinkUsers.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    certifications: text("certifications").notNull().default(""),
    minOrderValue: real("min_order_value").notNull().default(0),
    rating: real("rating").notNull().default(4.8),
  },
  (table) => [uniqueIndex("supplylink_producer_profile_user_idx").on(table.userId)],
);

export const supplylinkProducts = pgTable("supplylink_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  producerId: uuid("producer_id")
    .notNull()
    .references(() => supplylinkUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  retailPrice: real("retail_price").notNull(),
  wholesalePrice: real("wholesale_price").notNull(),
  moq: integer("moq").notNull().default(1),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  imageUrl: text("image_url").notNull(),
  isOrganic: boolean("is_organic").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const supplylinkOrders = pgTable("supplylink_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => supplylinkUsers.id),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => supplylinkUsers.id),
  totalAmount: real("total_amount").notNull(),
  orderType: supplylinkOrderType("order_type").notNull(),
  status: supplylinkOrderStatus("status").notNull().default("PENDING"),
  deliveryAddress: text("delivery_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const supplylinkOrderItems = pgTable("supplylink_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => supplylinkOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => supplylinkProducts.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
});

export const supplylinkMessages = pgTable("supplylink_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => supplylinkUsers.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id")
    .notNull()
    .references(() => supplylinkUsers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => supplylinkProducts.id, {
    onDelete: "set null",
  }),
  content: text("content").notNull(),
  quoteAmount: real("quote_amount"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSupplylinkUserSchema = createInsertSchema(supplylinkUsers).omit({
  id: true,
  createdAt: true,
});
export const insertProducerProfileSchema = createInsertSchema(producerProfiles).omit({
  id: true,
});
export const insertSupplylinkProductSchema = createInsertSchema(
  supplylinkProducts,
).omit({ id: true, createdAt: true });
export const insertSupplylinkOrderSchema = createInsertSchema(
  supplylinkOrders,
).omit({ id: true, createdAt: true });
export const insertSupplylinkOrderItemSchema = createInsertSchema(
  supplylinkOrderItems,
).omit({ id: true });
export const insertSupplylinkMessageSchema = createInsertSchema(
  supplylinkMessages,
).omit({ id: true, timestamp: true });

export type SupplylinkUser = typeof supplylinkUsers.$inferSelect;
export type ProducerProfile = typeof producerProfiles.$inferSelect;
export type SupplylinkProduct = typeof supplylinkProducts.$inferSelect;
export type SupplylinkOrder = typeof supplylinkOrders.$inferSelect;
export type SupplylinkOrderItem = typeof supplylinkOrderItems.$inferSelect;
export type SupplylinkMessage = typeof supplylinkMessages.$inferSelect;
