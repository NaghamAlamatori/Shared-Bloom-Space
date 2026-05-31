import { Router } from "express";
import { db } from "@workspace/db";
import { focusSessionsTable, membersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { CreateFocusSessionBody, EndFocusSessionBody } from "@workspace/api-zod";

const router = Router();

async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, userId)).limit(1);
  return member?.bloomSpaceId ?? null;
}

function formatSession(s: typeof focusSessionsTable.$inferSelect) {
  return {
    id: s.id, bloomSpaceId: s.bloomSpaceId, type: s.type, duration: s.duration,
    notes: s.notes, startedBy: s.startedBy,
    startedAt: s.startedAt?.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const sessions = await db.select().from(focusSessionsTable).where(eq(focusSessionsTable.bloomSpaceId, bloomSpaceId)).orderBy(desc(focusSessionsTable.startedAt));
  res.json(sessions.map(formatSession));
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const parsed = CreateFocusSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [session] = await db.insert(focusSessionsTable).values({ ...parsed.data, bloomSpaceId, startedBy: req.userId! }).returning();
  res.status(201).json(formatSession(session));
});

router.patch("/:id/end", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = EndFocusSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [session] = await db.update(focusSessionsTable).set({ duration: parsed.data.duration, notes: parsed.data.notes, endedAt: new Date() }).where(eq(focusSessionsTable.id, id)).returning();
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatSession(session));
});

export default router;
