import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, membersTable, availabilityTable, votesTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { CreateEventBody, UpdateEventBody, CreateAvailabilityBody, CreateVoteBody } from "@workspace/api-zod";

const router = Router();

async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, userId)).limit(1);
  return member?.bloomSpaceId ?? null;
}

function formatEvent(e: typeof eventsTable.$inferSelect) {
  return { id: e.id, bloomSpaceId: e.bloomSpaceId, title: e.title, description: e.description, date: e.date, startTime: e.startTime, endTime: e.endTime, location: e.location, notes: e.notes, category: e.category, isRecurring: e.isRecurring, recurringPattern: e.recurringPattern, reminderType: e.reminderType, createdAt: e.createdAt?.toISOString() };
}

// LIST EVENTS
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  let query = db.select().from(eventsTable).where(eq(eventsTable.bloomSpaceId, bloomSpaceId));
  const events = await query;

  const { month, year, category } = req.query;
  let filtered = events;
  if (month && year) {
    const m = String(month).padStart(2, "0");
    const y = String(year);
    filtered = filtered.filter(e => e.date.startsWith(`${y}-${m}`));
  }
  if (category) {
    filtered = filtered.filter(e => e.category === category);
  }
  res.json(filtered.map(formatEvent));
});

// UPCOMING EVENTS
router.get("/upcoming", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const events = await db.select().from(eventsTable).where(and(eq(eventsTable.bloomSpaceId, bloomSpaceId), gte(eventsTable.date, today), lte(eventsTable.date, in30)));
  res.json(events.sort((a, b) => a.date.localeCompare(b.date)).map(formatEvent));
});

// CREATE EVENT
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [event] = await db.insert(eventsTable).values({ ...parsed.data, bloomSpaceId }).returning();
  res.status(201).json(formatEvent(event));
});

// GET EVENT
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatEvent(event));
});

// UPDATE EVENT
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [event] = await db.update(eventsTable).set(parsed.data).where(eq(eventsTable.id, id)).returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatEvent(event));
});

// DELETE EVENT
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.status(204).send();
});

// AVAILABILITY
router.get("/availability/list", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const rows = await db.select().from(availabilityTable).where(eq(availabilityTable.bloomSpaceId, bloomSpaceId));
  const result = await Promise.all(rows.map(async (a) => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, a.userId)).limit(1);
    return { id: a.id, userId: a.userId, date: a.date, startTime: a.startTime, endTime: a.endTime, user: u ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl } : null };
  }));
  res.json(result);
});

router.post("/availability", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const parsed = CreateAvailabilityBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [row] = await db.insert(availabilityTable).values({ ...parsed.data, userId: req.userId!, bloomSpaceId }).returning();
  res.status(201).json({ id: row.id, userId: row.userId, date: row.date, startTime: row.startTime, endTime: row.endTime });
});

router.delete("/availability/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(availabilityTable).where(and(eq(availabilityTable.id, id), eq(availabilityTable.userId, req.userId!)));
  res.status(204).send();
});

// VOTES
router.get("/:eventId/votes", requireAuth, async (req: AuthRequest, res) => {
  const eventId = parseInt(String(req.params.eventId));
  const votes = await db.select().from(votesTable).where(eq(votesTable.eventId, eventId));
  const result = await Promise.all(votes.map(async (v) => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, v.userId)).limit(1);
    return { id: v.id, eventId: v.eventId, userId: v.userId, option: v.option, user: u ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl } : null };
  }));
  res.json(result);
});

router.post("/:eventId/votes", requireAuth, async (req: AuthRequest, res) => {
  const eventId = parseInt(String(req.params.eventId));
  const parsed = CreateVoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [vote] = await db.insert(votesTable).values({ eventId, userId: req.userId!, option: parsed.data.option }).returning();
  res.status(201).json({ id: vote.id, eventId: vote.eventId, userId: vote.userId, option: vote.option });
});

export default router;
