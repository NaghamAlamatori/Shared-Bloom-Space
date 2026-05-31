import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, memoriesTable, memoryPhotosTable, notesTable, tasksTable, focusSessionsTable, membersTable, usersTable, bloomSpacesTable } from "@workspace/db";
import { eq, desc, gte, lte, isNull, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, userId)).limit(1);
  return member?.bloomSpaceId ?? null;
}

function formatEvent(e: typeof eventsTable.$inferSelect) {
  return { id: e.id, bloomSpaceId: e.bloomSpaceId, title: e.title, description: e.description, date: e.date, startTime: e.startTime, endTime: e.endTime, location: e.location, notes: e.notes, category: e.category, isRecurring: e.isRecurring, recurringPattern: e.recurringPattern, reminderType: e.reminderType, createdAt: e.createdAt?.toISOString() };
}

async function formatMemory(m: typeof memoriesTable.$inferSelect) {
  const photos = await db.select().from(memoryPhotosTable).where(eq(memoryPhotosTable.memoryId, m.id));
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, m.createdBy)).limit(1);
  return {
    id: m.id, bloomSpaceId: m.bloomSpaceId, title: m.title, description: m.description,
    date: m.date, location: m.location, favoriteMoment: m.favoriteMoment, moodRating: m.moodRating,
    coverImageUrl: m.coverImageUrl, createdBy: m.createdBy, createdAt: m.createdAt?.toISOString(),
    photos: photos.map(p => ({ id: p.id, memoryId: p.memoryId, imageUrl: p.imageUrl, caption: p.caption })),
    creator: creator ? { id: creator.id, name: creator.name, email: creator.email, avatarUrl: creator.avatarUrl } : null,
  };
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

router.get("/summary", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const [space] = await db.select().from(bloomSpacesTable).where(eq(bloomSpacesTable.id, bloomSpaceId)).limit(1);

  const memberRows = await db.select().from(membersTable).where(eq(membersTable.bloomSpaceId, bloomSpaceId));
  const partnerRow = memberRows.find(m => m.userId !== req.userId!);
  let partnerName = null;
  let partnerAvatar = null;
  if (partnerRow) {
    const [partner] = await db.select().from(usersTable).where(eq(usersTable.id, partnerRow.userId)).limit(1);
    if (partner) { partnerName = partner.name; partnerAvatar = partner.avatarUrl; }
  }

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [memories, notes, tasks, upcomingEventsRaw, recentMemoriesRaw, activeSessions] = await Promise.all([
    db.select().from(memoriesTable).where(eq(memoriesTable.bloomSpaceId, bloomSpaceId)),
    db.select().from(notesTable).where(eq(notesTable.bloomSpaceId, bloomSpaceId)),
    db.select().from(tasksTable).where(eq(tasksTable.bloomSpaceId, bloomSpaceId)),
    db.select().from(eventsTable).where(and(eq(eventsTable.bloomSpaceId, bloomSpaceId), gte(eventsTable.date, today), lte(eventsTable.date, in30))).then(r => r.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)),
    db.select().from(memoriesTable).where(eq(memoriesTable.bloomSpaceId, bloomSpaceId)).orderBy(desc(memoriesTable.createdAt)).limit(4),
    db.select().from(focusSessionsTable).where(and(eq(focusSessionsTable.bloomSpaceId, bloomSpaceId), isNull(focusSessionsTable.endedAt))).limit(1),
  ]);

  const latestNoteRaw = notes.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const [upcomingEvents, recentMemories, latestNote, activeFocusSession] = await Promise.all([
    Promise.all(upcomingEventsRaw.map(e => formatEvent(e))),
    Promise.all(recentMemoriesRaw.map(m => formatMemory(m))),
    latestNoteRaw ? formatNote(latestNoteRaw) : Promise.resolve(null),
    activeSessions[0] ? Promise.resolve({ id: activeSessions[0].id, bloomSpaceId: activeSessions[0].bloomSpaceId, type: activeSessions[0].type, duration: activeSessions[0].duration, notes: activeSessions[0].notes, startedBy: activeSessions[0].startedBy, startedAt: activeSessions[0].startedAt?.toISOString(), endedAt: activeSessions[0].endedAt?.toISOString() ?? null }) : Promise.resolve(null),
  ]);

  res.json({
    totalMemories: memories.length,
    totalNotes: notes.length,
    totalTasks,
    completedTasks,
    taskCompletionRate,
    upcomingEvents,
    recentMemories,
    latestNote,
    activeFocusSession,
    bloomSpaceName: space?.name ?? "Our Bloom Space",
    partnerName,
    partnerAvatar,
  });
});

router.get("/countdown", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const events = await db.select().from(eventsTable).where(and(eq(eventsTable.bloomSpaceId, bloomSpaceId), gte(eventsTable.date, today)));
  const sorted = events.sort((a, b) => a.date.localeCompare(b.date));
  const next = sorted[0];

  if (!next) {
    res.json({ hasNextEvent: false, nextEvent: null, daysUntil: null, hoursUntil: null, minutesUntil: null, message: null });
    return;
  }

  const now = new Date();
  const eventDate = new Date(next.date + (next.startTime ? `T${next.startTime}` : "T00:00:00"));
  const diff = eventDate.getTime() - now.getTime();
  const daysUntil = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let message: string;
  if (daysUntil === 0 && hoursUntil === 0) message = `${next.title} in ${minutesUntil} minutes`;
  else if (daysUntil === 0) message = `${next.title} in ${hoursUntil} hours`;
  else if (daysUntil === 1) message = `${next.title} tomorrow`;
  else message = `${next.title} in ${daysUntil} days`;

  res.json({ hasNextEvent: true, nextEvent: formatEvent(next), daysUntil, hoursUntil, minutesUntil, message });
});

export default router;
