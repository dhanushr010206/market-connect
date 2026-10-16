import { Router, type IRouter, type Request, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, producerProfiles, supplylinkUsers } from "@workspace/db";
import { LoginBody, RegisterBody } from "@workspace/api-zod";

export type AuthRole = "PRODUCER" | "RETAILER" | "CUSTOMER";
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  phone: string | null;
  address: string;
  city: string;
  businessName: string | null;
  certifications: string | null;
  rating: number;
  createdAt: string;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; role: AuthRole };
    }
  }
}

const router: IRouter = Router();
const SESSION_DAYS = 7;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for SupplyLink authentication");
  }
  return secret;
}

export async function toPublicUser(user: typeof supplylinkUsers.$inferSelect): Promise<AuthUser> {
  const [profile] = await db
    .select()
    .from(producerProfiles)
    .where(eq(producerProfiles.userId, user.id))
    .limit(1);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    city: user.city,
    businessName: profile?.businessName ?? null,
    certifications: profile?.certifications ?? null,
    rating: profile?.rating ?? 0,
    createdAt: user.createdAt.toISOString(),
  };
}

export function issueToken(user: { id: string; role: AuthRole }): string {
  return jwt.sign({ userId: user.id, role: user.role }, sessionSecret(), {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, sessionSecret());
    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      !["PRODUCER", "RETAILER", "CUSTOMER"].includes(String(decoded.role))
    ) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    req.authUser = {
      id: decoded.userId,
      role: decoded.role as AuthRole,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
};

export function requireRole(...roles: AuthRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: "This account cannot perform that action" });
      return;
    }
    next();
  };
}

router.post("/auth/login", async (req: Request, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(supplylinkUsers)
    .where(eq(supplylinkUsers.email, parsed.data.email.toLowerCase()))
    .limit(1);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    res.status(401).json({ error: "Email or password is incorrect" });
    return;
  }

  res.json({ token: issueToken(user), user: await toPublicUser(user) });
});

router.post("/auth/register", async (req: Request, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db
    .select({ id: supplylinkUsers.id })
    .from(supplylinkUsers)
    .where(eq(supplylinkUsers.email, email))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "That email is already registered" });
    return;
  }

  const [user] = await db
    .insert(supplylinkUsers)
    .values({
      name: parsed.data.name,
      email,
      password: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role,
      phone: parsed.data.phone || null,
      address: parsed.data.address,
      city: parsed.data.city,
    })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Account could not be created" });
    return;
  }
  if (user.role === "PRODUCER") {
    await db.insert(producerProfiles).values({
      userId: user.id,
      businessName: parsed.data.businessName?.trim() || `${user.name}'s Farm`,
      certifications: parsed.data.certifications ?? "",
    });
  }

  res.status(201).json({ token: issueToken(user), user: await toPublicUser(user) });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(supplylinkUsers)
    .where(eq(supplylinkUsers.id, req.authUser!.id))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Account no longer exists" });
    return;
  }
  res.json(await toPublicUser(user));
});

export default router;
