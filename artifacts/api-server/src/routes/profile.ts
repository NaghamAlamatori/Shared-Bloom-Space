import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { UpdateProfileBody } from "@workspace/api-zod";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteFlower: user.favoriteFlower, favoriteActivity: user.favoriteActivity });
});

router.patch("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, req.userId!)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio, favoriteFlower: user.favoriteFlower, favoriteActivity: user.favoriteActivity });
});

export default router;
