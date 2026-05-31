import { Router } from "express";
import { db } from "@workspace/db";
import {
  memoriesTable, memoryPhotosTable, memoryCommentsTable, memoryReactionsTable,
  membersTable, usersTable
} from "@workspace/db";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { CreateMemoryBody, UpdateMemoryBody, AddMemoryPhotoBody } from "@workspace/api-zod";
const router = Router();

async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, userId)).limit(1);
  return member?.bloomSpaceId ?? null;
}

async function getBloomSpaceMembers(bloomSpaceId: number) {
  const members = await db
    .select({ user: usersTable })
    .from(membersTable)
    .innerJoin(usersTable, eq(usersTable.id, membersTable.userId))
    .where(eq(membersTable.bloomSpaceId, bloomSpaceId));
  return members.map(m => m.user);
}

async function formatMemory(m: typeof memoriesTable.$inferSelect, requestingUserId?: number) {
  const photos = await db
    .select()
    .from(memoryPhotosTable)
    .where(eq(memoryPhotosTable.memoryId, m.id))
    .orderBy(memoryPhotosTable.sortOrder);

  const rawComments = await db
    .select()
    .from(memoryCommentsTable)
    .where(eq(memoryCommentsTable.memoryId, m.id))
    .orderBy(memoryCommentsTable.createdAt);

  const reactions = await db
    .select()
    .from(memoryReactionsTable)
    .where(eq(memoryReactionsTable.memoryId, m.id));

  const members = await getBloomSpaceMembers(m.bloomSpaceId);
  const creator = members.find(u => u.id === m.createdBy) ?? null;
  const partner = members.find(u => u.id !== m.createdBy) ?? null;

  // Attach author info to comments
  const comments = rawComments.map(c => {
    const author = members.find(u => u.id === c.userId) ?? null;
    return {
      id: c.id,
      memoryId: c.memoryId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt?.toISOString(),
      author: author ? { id: author.id, name: author.name, email: author.email, avatarUrl: author.avatarUrl } : null,
    };
  });

  return {
    id: m.id,
    bloomSpaceId: m.bloomSpaceId,
    title: m.title,
    description: m.description,
    date: m.date,
    location: m.location,
    activityType: m.activityType,
    favoriteMoment: m.favoriteMoment,
    partnerFavoriteMoment: m.partnerFavoriteMoment,
    moodRating: m.moodRating,
    coverImageUrl: m.coverImageUrl,
    createdBy: m.createdBy,
    createdAt: m.createdAt?.toISOString(),
    photos: photos.map(p => ({
      id: p.id, memoryId: p.memoryId, imageUrl: p.imageUrl,
      caption: p.caption, sortOrder: p.sortOrder,
    })),
    comments,
    reactions: reactions.map(r => ({
      id: r.id, memoryId: r.memoryId, userId: r.userId, reactionType: r.reactionType,
    })),
    creator: creator ? { id: creator.id, name: creator.name, email: creator.email, avatarUrl: creator.avatarUrl } : null,
    partner: partner ? { id: partner.id, name: partner.name, email: partner.email, avatarUrl: partner.avatarUrl } : null,
  };
}

// LIST
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const memories = await db.select().from(memoriesTable)
    .where(eq(memoriesTable.bloomSpaceId, bloomSpaceId))
    .orderBy(desc(memoriesTable.date));
  const result = await Promise.all(memories.map(m => formatMemory(m, req.userId!)));
  res.json(result);
});

// RECENT
router.get("/recent", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const memories = await db.select().from(memoriesTable)
    .where(eq(memoriesTable.bloomSpaceId, bloomSpaceId))
    .orderBy(desc(memoriesTable.createdAt))
    .limit(6);
  const result = await Promise.all(memories.map(m => formatMemory(m, req.userId!)));
  res.json(result);
});

// SEARCH
router.get("/search", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.json([]); return; }
  const memories = await db.select().from(memoriesTable)
    .where(and(
      eq(memoriesTable.bloomSpaceId, bloomSpaceId),
      or(
        ilike(memoriesTable.title, `%${q}%`),
        ilike(memoriesTable.location, `%${q}%`),
        ilike(memoriesTable.description, `%${q}%`),
        ilike(memoriesTable.favoriteMoment, `%${q}%`),
        ilike(memoriesTable.partnerFavoriteMoment, `%${q}%`),
      )
    ))
    .orderBy(desc(memoriesTable.date));
  const result = await Promise.all(memories.map(m => formatMemory(m, req.userId!)));
  res.json(result);
});

// CREATE
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const parsed = CreateMemoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [memory] = await db.insert(memoriesTable)
    .values({ ...parsed.data, bloomSpaceId, createdBy: req.userId! })
    .returning();
  res.status(201).json(await formatMemory(memory, req.userId!));
});

// GET BY ID
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [memory] = await db.select().from(memoriesTable).where(eq(memoriesTable.id, id)).limit(1);
  if (!memory) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await formatMemory(memory, req.userId!));
});

// UPDATE
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = UpdateMemoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [memory] = await db.update(memoriesTable).set(parsed.data).where(eq(memoriesTable.id, id)).returning();
  if (!memory) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await formatMemory(memory, req.userId!));
});

// DELETE
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(memoryReactionsTable).where(eq(memoryReactionsTable.memoryId, id));
  await db.delete(memoryCommentsTable).where(eq(memoryCommentsTable.memoryId, id));
  await db.delete(memoryPhotosTable).where(eq(memoryPhotosTable.memoryId, id));
  await db.delete(memoriesTable).where(eq(memoriesTable.id, id));
  res.status(204).send();
});

// ADD PHOTO
router.post("/:id/photos", requireAuth, async (req: AuthRequest, res) => {
  const memoryId = parseInt(String(req.params.id));
  const parsed = AddMemoryPhotoBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [photo] = await db.insert(memoryPhotosTable)
    .values({ memoryId, imageUrl: parsed.data.imageUrl, caption: parsed.data.caption, sortOrder: parsed.data.sortOrder ?? 0 })
    .returning();
  res.status(201).json({ id: photo.id, memoryId: photo.memoryId, imageUrl: photo.imageUrl, caption: photo.caption, sortOrder: photo.sortOrder });
});

// UPDATE PHOTO (caption / sort order)
router.patch("/:memoryId/photos/:photoId", requireAuth, async (req: AuthRequest, res) => {
  const photoId = parseInt(String(req.params.photoId));
  const { caption, sortOrder } = req.body as { caption?: string | null; sortOrder?: number | null };
  const updates: Record<string, unknown> = {};
  if (caption !== undefined) updates.caption = caption;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  const [photo] = await db.update(memoryPhotosTable).set(updates).where(eq(memoryPhotosTable.id, photoId)).returning();
  if (!photo) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: photo.id, memoryId: photo.memoryId, imageUrl: photo.imageUrl, caption: photo.caption, sortOrder: photo.sortOrder });
});

// DELETE PHOTO
router.delete("/:memoryId/photos/:photoId", requireAuth, async (req: AuthRequest, res) => {
  const photoId = parseInt(String(req.params.photoId));
  await db.delete(memoryPhotosTable).where(eq(memoryPhotosTable.id, photoId));
  res.status(204).send();
});

// LIST COMMENTS
router.get("/:id/comments", requireAuth, async (req: AuthRequest, res) => {
  const memoryId = parseInt(String(req.params.id));
  const rawComments = await db.select().from(memoryCommentsTable)
    .where(eq(memoryCommentsTable.memoryId, memoryId))
    .orderBy(memoryCommentsTable.createdAt);
  const withAuthors = await Promise.all(rawComments.map(async c => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, c.userId)).limit(1);
    return {
      id: c.id, memoryId: c.memoryId, userId: c.userId, content: c.content,
      createdAt: c.createdAt?.toISOString(),
      author: author ? { id: author.id, name: author.name, email: author.email, avatarUrl: author.avatarUrl } : null,
    };
  }));
  res.json(withAuthors);
});

// ADD COMMENT
router.post("/:id/comments", requireAuth, async (req: AuthRequest, res) => {
  const memoryId = parseInt(String(req.params.id));
  const { content } = req.body;
  if (!content || typeof content !== "string") { res.status(400).json({ error: "content required" }); return; }
  const [comment] = await db.insert(memoryCommentsTable)
    .values({ memoryId, userId: req.userId!, content })
    .returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  res.status(201).json({
    id: comment.id, memoryId: comment.memoryId, userId: comment.userId,
    content: comment.content, createdAt: comment.createdAt?.toISOString(),
    author: author ? { id: author.id, name: author.name, email: author.email, avatarUrl: author.avatarUrl } : null,
  });
});

// DELETE COMMENT
router.delete("/:id/comments/:commentId", requireAuth, async (req: AuthRequest, res) => {
  const commentId = parseInt(String(req.params.commentId));
  await db.delete(memoryCommentsTable).where(
    and(eq(memoryCommentsTable.id, commentId), eq(memoryCommentsTable.userId, req.userId!))
  );
  res.status(204).send();
});

// TOGGLE REACTION
router.post("/:id/reactions", requireAuth, async (req: AuthRequest, res) => {
  const memoryId = parseInt(String(req.params.id));
  const { reactionType } = req.body;
  if (!reactionType) { res.status(400).json({ error: "reactionType required" }); return; }

  const [existing] = await db.select().from(memoryReactionsTable)
    .where(and(
      eq(memoryReactionsTable.memoryId, memoryId),
      eq(memoryReactionsTable.userId, req.userId!),
      eq(memoryReactionsTable.reactionType, reactionType)
    )).limit(1);

  if (existing) {
    await db.delete(memoryReactionsTable).where(eq(memoryReactionsTable.id, existing.id));
  } else {
    await db.insert(memoryReactionsTable).values({ memoryId, userId: req.userId!, reactionType });
  }

  const reactions = await db.select().from(memoryReactionsTable)
    .where(eq(memoryReactionsTable.memoryId, memoryId));
  res.json(reactions.map(r => ({ id: r.id, memoryId: r.memoryId, userId: r.userId, reactionType: r.reactionType })));
});

export default router;
