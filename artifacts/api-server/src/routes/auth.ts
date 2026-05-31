import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, generateToken, type AuthRequest } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash }).returning();

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteFlower: user.favoriteFlower, favoriteActivity: user.favoriteActivity, createdAt: user.createdAt?.toISOString() },
  });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteFlower: user.favoriteFlower, favoriteActivity: user.favoriteActivity, createdAt: user.createdAt?.toISOString() },
  });
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteFlower: user.favoriteFlower, favoriteActivity: user.favoriteActivity, createdAt: user.createdAt?.toISOString() });
});

export default router;
