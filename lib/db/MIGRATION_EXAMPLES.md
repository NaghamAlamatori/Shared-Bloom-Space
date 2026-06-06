# Prisma Migration Examples - Real Code

This document shows actual code from your application and how to migrate it from Drizzle to Prisma.

## Example 1: Auth Routes (Simple Queries)

### BEFORE (Drizzle - auth.ts)

```typescript
import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, generateToken, type AuthRequest } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

// Register endpoint
router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, email, password } = parsed.data;

  // Check existing user
  const existing = await db.select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
    
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  // Create new user
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable)
    .values({ name, email, passwordHash })
    .returning();

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      avatarUrl: user.avatarUrl, 
      bio: user.bio, 
      favoriteFlower: user.favoriteFlower, 
      favoriteActivity: user.favoriteActivity, 
      createdAt: user.createdAt?.toISOString() 
    },
  });
});

// Login endpoint
router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
    
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
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      avatarUrl: user.avatarUrl, 
      bio: user.bio, 
      favoriteFlower: user.favoriteFlower, 
      favoriteActivity: user.favoriteActivity, 
      createdAt: user.createdAt?.toISOString() 
    },
  });
});

// Get current user
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);
    
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  
  res.json({ 
    id: user.id, 
    name: user.name, 
    email: user.email, 
    avatarUrl: user.avatarUrl, 
    bio: user.bio, 
    favoriteFlower: user.favoriteFlower, 
    favoriteActivity: user.favoriteActivity, 
    createdAt: user.createdAt?.toISOString() 
  });
});

export default router;
```

### AFTER (Prisma - auth.ts)

```typescript
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@workspace/db";
import type { User } from "@workspace/db";
import { requireAuth, generateToken, type AuthRequest } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

// Helper to format user response
function formatUserResponse(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    favoriteFlower: user.favoriteFlower,
    favoriteActivity: user.favoriteActivity,
    createdAt: user.createdAt.toISOString(),
  };
}

// Register endpoint
router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, email, password } = parsed.data;

  // Check existing user - using findUnique for unique field
  const existing = await prisma.user.findUnique({
    where: { email }
  });
  
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  // Create new user - no need for .returning(), Prisma returns by default
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash }
  });

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: formatUserResponse(user),
  });
});

// Login endpoint
router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  // Find user by unique email
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
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
    user: formatUserResponse(user),
  });
});

// Get current user
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! }
  });
  
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  
  res.json(formatUserResponse(user));
});

export default router;
```

## Example 2: Tasks Routes (Complex Queries with Relations)

### BEFORE (Drizzle - tasks.ts)

```typescript
import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, bloomFlowersTable, membersTable, usersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

const FLOWER_TYPES = ["rose", "peony", "tulip", "daisy", "cherry_blossom"] as const;

// Helper functions
async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const [member] = await db.select()
    .from(membersTable)
    .where(eq(membersTable.userId, userId))
    .limit(1);
  return member?.bloomSpaceId ?? null;
}

async function formatUser(userId: number | null) {
  if (!userId) return null;
  const [u] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
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

// Get all tasks
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { 
    res.status(404).json({ error: "No Bloom Space" }); 
    return; 
  }

  let tasks = await db.select()
    .from(tasksTable)
    .where(eq(tasksTable.bloomSpaceId, bloomSpaceId));

  // Filter manually
  const { category, completed, assignedTo } = req.query;
  if (category) tasks = tasks.filter(t => t.category === category);
  if (completed !== undefined) tasks = tasks.filter(t => t.completed === (completed === "true"));
  if (assignedTo) tasks = tasks.filter(t => t.assignedTo === parseInt(String(assignedTo)));

  const result = await Promise.all(tasks.map(formatTask));
  res.json(result);
});

// Create task
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { 
    res.status(404).json({ error: "No Bloom Space" }); 
    return; 
  }
  
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { 
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); 
    return; 
  }
  
  const [task] = await db.insert(tasksTable)
    .values({ ...parsed.data, bloomSpaceId })
    .returning();
    
  res.status(201).json(await formatTask(task));
});

// Update task
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { 
    res.status(400).json({ error: "Invalid input" }); 
    return; 
  }
  
  const [task] = await db.update(tasksTable)
    .set(parsed.data)
    .where(eq(tasksTable.id, id))
    .returning();
    
  if (!task) { 
    res.status(404).json({ error: "Not found" }); 
    return; 
  }
  
  res.json(await formatTask(task));
});

// Delete task
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).send();
});

// Complete task (with flower reward logic)
router.patch("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const userId = req.userId!;
  const bloomSpaceId = await getUserBloomSpaceId(userId);
  if (!bloomSpaceId) { 
    res.status(404).json({ error: "No Bloom Space" }); 
    return; 
  }

  const [current] = await db.select()
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);
    
  if (!current) { 
    res.status(404).json({ error: "Not found" }); 
    return; 
  }

  if (current.assignedTo && current.assignedTo !== userId) {
    res.status(403).json({ error: "Only the assigned user can toggle this task" });
    return;
  }

  const wasCompleted = current.completed;
  const nowCompleted = !wasCompleted;

  const [task] = await db.update(tasksTable)
    .set({ 
      completed: nowCompleted, 
      completedAt: nowCompleted ? new Date() : null 
    })
    .where(eq(tasksTable.id, id))
    .returning();

  let newFlower = null;
  let progressToNext = 0;

  if (nowCompleted) {
    // Count completed tasks
    const completedByMe = await db.select()
      .from(tasksTable)
      .where(and(
        eq(tasksTable.bloomSpaceId, bloomSpaceId),
        eq(tasksTable.completed, true),
        ...(current.assignedTo ? [eq(tasksTable.assignedTo, userId)] : []),
      ));
      
    const myCompletedCount = completedByMe.length;
    progressToNext = myCompletedCount % 4;

    // Award flower every 4 tasks
    if (myCompletedCount > 0 && myCompletedCount % 4 === 0) {
      const existingFlowers = await db.select()
        .from(bloomFlowersTable)
        .where(and(
          eq(bloomFlowersTable.bloomSpaceId, bloomSpaceId), 
          eq(bloomFlowersTable.earnedBy, userId)
        ));
        
      const flowerIndex = existingFlowers.length % FLOWER_TYPES.length;
      const flowerType = FLOWER_TYPES[flowerIndex];

      const [flower] = await db.insert(bloomFlowersTable)
        .values({ bloomSpaceId, earnedBy: userId, flowerType })
        .returning();
        
      newFlower = await formatFlower(flower);
    }
  }

  res.json({ 
    task: await formatTask(task), 
    newFlower, 
    progressToNext 
  });
});

export default router;
```

### AFTER (Prisma - tasks.ts)

```typescript
import { Router } from "express";
import { prisma } from "@workspace/db";
import type { Task, BloomFlower, User } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

const FLOWER_TYPES = ["rose", "peony", "tulip", "daisy", "cherry_blossom"] as const;

// Helper functions
async function getUserBloomSpaceId(userId: number): Promise<number | null> {
  const member = await prisma.member.findFirst({
    where: { userId },
    select: { bloomSpaceId: true }
  });
  return member?.bloomSpaceId ?? null;
}

function formatUser(user: User | null) {
  if (!user) return null;
  return { 
    id: user.id, 
    name: user.name, 
    email: user.email, 
    avatarUrl: user.avatarUrl 
  };
}

// Get all tasks with relations
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { 
    res.status(404).json({ error: "No Bloom Space" }); 
    return; 
  }

  // Build dynamic where clause
  const { category, completed, assignedTo } = req.query;
  const where: any = { bloomSpaceId };
  
  if (category) where.category = category as string;
  if (completed !== undefined) where.completed = completed === "true";
  if (assignedTo) where.assignedTo = parseInt(String(assignedTo));

  // Fetch tasks with relations in one query
  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: true  // Automatically includes user data
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Format response
  const result = tasks.map(task => ({
    id: task.id,
    bloomSpaceId: task.bloomSpaceId,
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    dueDate: task.dueDate,
    category: task.category,
    completed: task.completed,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    assignee: formatUser(task.assignee),
  }));

  res.json(result);
});

// Create task
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const bloomSpaceId = await getUserBloomSpaceId(req.userId!);
  if (!bloomSpaceId) { 
    res.status(404).json({ error: "No Bloom Space" }); 
    return; 
  }
  
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { 
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); 
    return; 
  }
  
  // Create with relation
  const task = await prisma.task.create({
    data: { 
      ...parsed.data, 
      bloomSpace: {
        connect: { id: bloomSpaceId }
      }
    },
    include: {
      assignee: true
    }
  });
    
  res.status(201).json({
    ...task,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
    assignee: formatUser(task.assignee),
  });
});

// Update task
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { 
    res.status(400).json({ error: "Invalid input" }); 
    return; 
  }
  
  try {
    const task = await prisma.task.update({
      where: { id },
      data: parsed.data,
      include: {
        assignee: true
      }
    });
    
    res.json({
      ...task,
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      assignee: formatUser(task.assignee),
    });
  } catch (error) {
    res.status(404).json({ error: "Not found" });
  }
});

// Delete task
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  
  try {
    await prisma.task.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: "Not found" });
  }
});

// Complete task (with flower reward logic)
router.patch("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const userId = req.userId!;
  const bloomSpaceId = await getUserBloomSpaceId(userId);
  if (!bloomSpaceId) { 
    res.status(404).json({ error: "No Bloom Space" }); 
    return; 
  }

  // Find current task
  const current = await prisma.task.findUnique({
    where: { id }
  });
    
  if (!current) { 
    res.status(404).json({ error: "Not found" }); 
    return; 
  }

  if (current.assignedTo && current.assignedTo !== userId) {
    res.status(403).json({ error: "Only the assigned user can toggle this task" });
    return;
  }

  const wasCompleted = current.completed;
  const nowCompleted = !wasCompleted;

  // Update task
  const task = await prisma.task.update({
    where: { id },
    data: { 
      completed: nowCompleted, 
      completedAt: nowCompleted ? new Date() : null 
    },
    include: {
      assignee: true
    }
  });

  let newFlower = null;
  let progressToNext = 0;

  if (nowCompleted) {
    // Count completed tasks - Prisma count is cleaner
    const myCompletedCount = await prisma.task.count({
      where: {
        bloomSpaceId,
        completed: true,
        ...(current.assignedTo ? { assignedTo: userId } : {}),
      }
    });
      
    progressToNext = myCompletedCount % 4;

    // Award flower every 4 tasks
    if (myCompletedCount > 0 && myCompletedCount % 4 === 0) {
      // Count existing flowers
      const existingFlowersCount = await prisma.bloomFlower.count({
        where: {
          bloomSpaceId,
          earnedBy: userId
        }
      });
        
      const flowerIndex = existingFlowersCount % FLOWER_TYPES.length;
      const flowerType = FLOWER_TYPES[flowerIndex];

      // Create flower with relations
      const flower = await prisma.bloomFlower.create({
        data: { 
          flowerType,
          bloomSpace: {
            connect: { id: bloomSpaceId }
          },
          earner: {
            connect: { id: userId }
          }
        },
        include: {
          earner: true,
          receiver: true
        }
      });
        
      newFlower = {
        id: flower.id,
        bloomSpaceId: flower.bloomSpaceId,
        earnedBy: flower.earnedBy,
        flowerType: flower.flowerType,
        gifted: flower.gifted,
        giftedTo: flower.giftedTo,
        giftMessage: flower.giftMessage,
        giftedAt: flower.giftedAt?.toISOString() ?? null,
        createdAt: flower.createdAt.toISOString(),
        earner: formatUser(flower.earner),
        recipient: formatUser(flower.receiver),
      };
    }
  }

  res.json({ 
    task: {
      ...task,
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      assignee: formatUser(task.assignee),
    }, 
    newFlower, 
    progressToNext 
  });
});

export default router;
```

## Key Differences Summary

### 1. Import Changes
- **Drizzle**: `import { db } from "@workspace/db"; import { usersTable } from "@workspace/db";`
- **Prisma**: `import { prisma } from "@workspace/db"; import type { User } from "@workspace/db";`

### 2. Query Syntax
- **Drizzle**: `db.select().from(table).where(eq(...))`
- **Prisma**: `prisma.model.findMany({ where: {...} })`

### 3. Unique Lookups
- **Drizzle**: `db.select().from(table).where(eq(...)).limit(1)` - Returns array
- **Prisma**: `prisma.model.findUnique({ where: {...} })` - Returns single object or null

### 4. Insert/Create
- **Drizzle**: `db.insert(table).values({...}).returning()` - Returns array
- **Prisma**: `prisma.model.create({ data: {...} })` - Returns single object

### 5. Update
- **Drizzle**: `db.update(table).set({...}).where(...).returning()` - Returns array
- **Prisma**: `prisma.model.update({ where: {...}, data: {...} })` - Returns single object

### 6. Delete
- **Drizzle**: `db.delete(table).where(...)`
- **Prisma**: `prisma.model.delete({ where: {...} })`

### 7. Relations
- **Drizzle**: Manual joins or separate queries
- **Prisma**: `include: { relation: true }` - Auto-loads relations in one query

### 8. Counting
- **Drizzle**: `db.select().from(table).where(...)` then get `.length`
- **Prisma**: `prisma.model.count({ where: {...} })` - Direct count query

### 9. Error Handling
- **Drizzle**: Check if array is empty or has items
- **Prisma**: Use try/catch, null checks, or error types

### 10. Type Safety
- **Drizzle**: `typeof table.$inferSelect`
- **Prisma**: Generated types from `@prisma/client`
