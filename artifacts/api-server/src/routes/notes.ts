import { Router } from "express";
import { db } from "@workspace/db";
import { notesTable, membersTable, usersTable } from "@workspace/db";
import { eq, desc, and, ilike } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { CreateNoteBody, UpdateNoteBody } from "@workspace/api-zod";

const router = Router();

async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, userId)).limit(1);
  return member?.bloomSpaceId ?? null;
}

async function formatNote(n: typeof notesTable.$inferSelect) {
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, n.createdBy)).limit(1);
  return {
    id: n.id, bloomSpaceId: n.bloomSpaceId, content: n.content, style: n.style,
    isPinned: n.isPinned, heartCount: n.heartCount, createdBy: n.createdBy,
    createdAt: n.createdAt?.toISOString(),
    creator: creator ? { id: creator.id, name: creator.name, email: creator.email, avatarUrl: creator.avatarUrl } : null,
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  let notes = await db.select().from(notesTable).where(eq(notesTable.bloomSpaceId, bloomSpaceId)).orderBy(desc(notesTable.createdAt));

  const { pinned, search } = req.query;
  if (pinned === "true") notes = notes.filter(n => n.isPinned);
  if (search && typeof search === "string") {
    notes = notes.filter(n => n.content.toLowerCase().includes(search.toLowerCase()));
  }

  const result = await Promise.all(notes.map(formatNote));
  res.json(result);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [note] = await db.insert(notesTable).values({ ...parsed.data, bloomSpaceId, createdBy: req.userId! }).returning();
  res.status(201).json(await formatNote(note));
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [note] = await db.select().from(notesTable).where(eq(notesTable.id, id)).limit(1);
  if (!note) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await formatNote(note));
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [note] = await db.update(notesTable).set(parsed.data).where(eq(notesTable.id, id)).returning();
  if (!note) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await formatNote(note));
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(notesTable).where(eq(notesTable.id, id));
  res.status(204).send();
});

router.patch("/:id/pin", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [current] = await db.select().from(notesTable).where(eq(notesTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }
  const [note] = await db.update(notesTable).set({ isPinned: !current.isPinned }).where(eq(notesTable.id, id)).returning();
  res.json(await formatNote(note));
});

router.post("/:id/react", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [current] = await db.select().from(notesTable).where(eq(notesTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }
  const [note] = await db.update(notesTable).set({ heartCount: (current.heartCount || 0) + 1 }).where(eq(notesTable.id, id)).returning();
  res.json(await formatNote(note));
});

export default router;
