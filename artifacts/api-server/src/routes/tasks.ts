import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, bloomFlowersTable, membersTable, usersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";

const router = Router();

const FLOWER_TYPES = ["rose", "peony", "tulip", "daisy", "cherry_blossom"] as const;

async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, userId)).limit(1);
  return member?.bloomSpaceId ?? null;
}

async function getPartnerUserId(userId: number, bloomSpaceId: number): Promise<number | null> {
  const members = await db.select().from(membersTable).where(eq(membersTable.bloomSpaceId, bloomSpaceId));
  const partner = members.find(m => m.userId !== userId);
  return partner?.userId ?? null;
}

async function formatUser(userId: number | null) {
  if (!userId) return null;
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return u ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl } : null;
}

async function formatTask(t: typeof tasksTable.$inferSelect) {
  const assignee = await formatUser(t.assignedTo ?? null);
  return {
    id: t.id,
    bloomSpaceId: t.bloomSpaceId,
    title: t.title,
    description: t.description,
    assignedTo: t.assignedTo,
    dueDate: t.dueDate,
    category: t.category,
    completed: t.completed,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt?.toISOString(),
    assignee,
  };
}

async function formatFlower(f: typeof bloomFlowersTable.$inferSelect) {
  const [earner, recipient] = await Promise.all([
    formatUser(f.earnedBy),
    formatUser(f.giftedTo ?? null),
  ]);
  return {
    id: f.id,
    bloomSpaceId: f.bloomSpaceId,
    earnedBy: f.earnedBy,
    flowerType: f.flowerType,
    gifted: f.gifted,
    giftedTo: f.giftedTo,
    giftMessage: f.giftMessage,
    giftedAt: f.giftedAt?.toISOString() ?? null,
    createdAt: f.createdAt?.toISOString(),
    earner,
    recipient,
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  let tasks = await db.select().from(tasksTable).where(eq(tasksTable.bloomSpaceId, bloomSpaceId));

  const { category, completed, assignedTo } = req.query;
  if (category) tasks = tasks.filter(t => t.category === category);
  if (completed !== undefined) tasks = tasks.filter(t => t.completed === (completed === "true"));
  if (assignedTo) tasks = tasks.filter(t => t.assignedTo === parseInt(String(assignedTo)));

  const result = await Promise.all(tasks.map(formatTask));
  res.json(result);
});

router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const userId = req.userId!;
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.bloomSpaceId, bloomSpaceId));
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const completionRate = total > 0 ? completed / total : 0;

  const categories = ["personal", "study", "work", "travel", "relationship", "custom"];
  const byCategory = categories.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    return { category: cat, total: catTasks.length, completed: catTasks.filter(t => t.completed).length };
  }).filter(c => c.total > 0);

  const partnerId = await getPartnerUserId(userId, bloomSpaceId);

  const myCompleted = tasks.filter(t => t.completed && t.assignedTo === userId).length;
  const myFlowers = await db.select().from(bloomFlowersTable)
    .where(and(eq(bloomFlowersTable.bloomSpaceId, bloomSpaceId), eq(bloomFlowersTable.earnedBy, userId)));

  let partnerProgress = null;
  if (partnerId) {
    const partnerCompleted = tasks.filter(t => t.completed && t.assignedTo === partnerId).length;
    const partnerFlowers = await db.select().from(bloomFlowersTable)
      .where(and(eq(bloomFlowersTable.bloomSpaceId, bloomSpaceId), eq(bloomFlowersTable.earnedBy, partnerId)));
    partnerProgress = {
      completedCount: partnerCompleted,
      progressToNext: partnerCompleted % 4,
      flowerCount: partnerFlowers.length,
    };
  }

  res.json({
    total, completed, completionRate, byCategory,
    myProgress: {
      completedCount: myCompleted,
      progressToNext: myCompleted % 4,
      flowerCount: myFlowers.length,
    },
    partnerProgress,
  });
});

router.get("/flowers", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const flowers = await db.select().from(bloomFlowersTable)
    .where(eq(bloomFlowersTable.bloomSpaceId, bloomSpaceId));

  const result = await Promise.all(flowers.map(formatFlower));
  res.json(result);
});

router.post("/flowers/:flowerId/gift", requireAuth, async (req: AuthRequest, res) => {
  const flowerId = parseInt(String(req.params.flowerId));
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const [flower] = await db.select().from(bloomFlowersTable).where(eq(bloomFlowersTable.id, flowerId)).limit(1);
  if (!flower) { res.status(404).json({ error: "Flower not found" }); return; }
  if (flower.earnedBy !== req.userId!) { res.status(403).json({ error: "Not your flower" }); return; }
  if (flower.gifted) { res.status(400).json({ error: "Already gifted" }); return; }

  const partnerId = await getPartnerUserId(req.userId!, bloomSpaceId);
  if (!partnerId) { res.status(400).json({ error: "No partner to gift to" }); return; }

  const message = typeof req.body.message === "string" ? req.body.message : null;

  const [updated] = await db.update(bloomFlowersTable)
    .set({ gifted: true, giftedTo: partnerId, giftMessage: message, giftedAt: new Date() })
    .where(eq(bloomFlowersTable.id, flowerId))
    .returning();

  res.json(await formatFlower(updated));
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
  const [task] = await db.insert(tasksTable).values({ ...parsed.data, bloomSpaceId }).returning();
  res.status(201).json(await formatTask(task));
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [task] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await formatTask(task));
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).send();
});

router.patch("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const userId = req.userId!;
  const bloomSpaceId = await getUserBloomSpaceId(userId);
  if (!bloomSpaceId) { res.status(404).json({ error: "No Bloom Space" }); return; }

  const [current] = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }

  if (current.assignedTo && current.assignedTo !== userId) {
    res.status(403).json({ error: "Only the assigned user can toggle this task" });
    return;
  }

  const wasCompleted = current.completed;
  const nowCompleted = !wasCompleted;

  const [task] = await db.update(tasksTable)
    .set({ completed: nowCompleted, completedAt: nowCompleted ? new Date() : null })
    .where(eq(tasksTable.id, id))
    .returning();

  let newFlower = null;
  let progressToNext = 0;

  if (nowCompleted) {
    const completedByMe = await db.select().from(tasksTable)
      .where(and(
        eq(tasksTable.bloomSpaceId, bloomSpaceId),
        eq(tasksTable.completed, true),
        ...(current.assignedTo ? [eq(tasksTable.assignedTo, userId)] : []),
      ));
    const myCompletedCount = completedByMe.length;
    progressToNext = myCompletedCount % 4;

    if (myCompletedCount > 0 && myCompletedCount % 4 === 0) {
      const existingFlowers = await db.select().from(bloomFlowersTable)
        .where(and(eq(bloomFlowersTable.bloomSpaceId, bloomSpaceId), eq(bloomFlowersTable.earnedBy, userId)));
      const flowerIndex = existingFlowers.length % FLOWER_TYPES.length;
      const flowerType = FLOWER_TYPES[flowerIndex];

      const [flower] = await db.insert(bloomFlowersTable)
        .values({ bloomSpaceId, earnedBy: userId, flowerType })
        .returning();
      newFlower = await formatFlower(flower);
    }
  }

  res.json({ task: await formatTask(task), newFlower, progressToNext });
});

export default router;
