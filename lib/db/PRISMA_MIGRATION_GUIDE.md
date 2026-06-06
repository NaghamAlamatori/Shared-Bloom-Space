# Prisma Migration Guide

## Overview

This guide covers the complete migration from Drizzle ORM to Prisma ORM for the Shared Bloom Space application.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase)
- Database URL configured in `.env` file

## Step 1: Install Dependencies

```bash
cd lib/db
pnpm install
```

This will install:
- `@prisma/client` - Prisma Client for database access
- `prisma` - Prisma CLI for migrations and schema management

## Step 2: Generate Prisma Client

```bash
pnpm run prisma:generate
```

This generates the Prisma Client based on your schema.

## Step 3: Create Initial Migration from Existing Database

Since you already have a database with Drizzle schema, you have two options:

### Option A: Introspect Existing Database (Recommended)

```bash
# Pull the current database schema into Prisma
pnpm run prisma:pull

# This will update schema.prisma based on your current database
# Compare with the generated schema.prisma and merge if needed
```

### Option B: Push Schema to Database

```bash
# Push the Prisma schema to the database
# This will sync the database with the schema without creating migration files
pnpm run prisma:push
```

### Option C: Create Migration Files

```bash
# Create migration files for the schema
pnpm run prisma:migrate

# Name it something like "initial_migration_from_drizzle"
```

## Step 4: Update Application Code

### Import Changes

**Before (Drizzle):**
```typescript
import { db } from "@workspace/db";
import { usersTable, bloomSpacesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
```

**After (Prisma):**
```typescript
import { prisma } from "@workspace/db";
import type { User, BloomSpace } from "@workspace/db";
```

### Query Changes

#### SELECT Queries

**Before (Drizzle):**
```typescript
// Get single user
const user = await db.select()
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .limit(1);

// Get multiple users
const users = await db.select()
  .from(usersTable)
  .where(eq(usersTable.id, userId));
```

**After (Prisma):**
```typescript
// Get single user
const user = await prisma.user.findUnique({
  where: { email }
});

// Get multiple users
const users = await prisma.user.findMany({
  where: { id: userId }
});
```

#### INSERT Queries

**Before (Drizzle):**
```typescript
const [newUser] = await db.insert(usersTable)
  .values({
    name: "John",
    email: "john@example.com"
  })
  .returning();
```

**After (Prisma):**
```typescript
const newUser = await prisma.user.create({
  data: {
    name: "John",
    email: "john@example.com"
  }
});
```

#### UPDATE Queries

**Before (Drizzle):**
```typescript
const [updatedUser] = await db.update(usersTable)
  .set({ name: "Jane" })
  .where(eq(usersTable.id, userId))
  .returning();
```

**After (Prisma):**
```typescript
const updatedUser = await prisma.user.update({
  where: { id: userId },
  data: { name: "Jane" }
});
```

#### DELETE Queries

**Before (Drizzle):**
```typescript
await db.delete(usersTable)
  .where(eq(usersTable.id, userId));
```

**After (Prisma):**
```typescript
await prisma.user.delete({
  where: { id: userId }
});
```

#### Relation Queries

**Before (Drizzle):**
```typescript
const memories = await db.select()
  .from(memoriesTable)
  .leftJoin(usersTable, eq(memoriesTable.createdBy, usersTable.id))
  .where(eq(memoriesTable.bloomSpaceId, spaceId));
```

**After (Prisma):**
```typescript
const memories = await prisma.memory.findMany({
  where: { bloomSpaceId: spaceId },
  include: {
    creator: true,
    photos: true,
    comments: {
      include: { user: true }
    },
    reactions: {
      include: { user: true }
    }
  }
});
```

#### Complex WHERE Clauses

**Before (Drizzle):**
```typescript
const tasks = await db.select()
  .from(tasksTable)
  .where(
    and(
      eq(tasksTable.bloomSpaceId, spaceId),
      eq(tasksTable.completed, false)
    )
  );
```

**After (Prisma):**
```typescript
const tasks = await prisma.task.findMany({
  where: {
    bloomSpaceId: spaceId,
    completed: false
  }
});
```

#### Ordering

**Before (Drizzle):**
```typescript
const notes = await db.select()
  .from(notesTable)
  .orderBy(desc(notesTable.createdAt));
```

**After (Prisma):**
```typescript
const notes = await prisma.note.findMany({
  orderBy: {
    createdAt: 'desc'
  }
});
```

## Step 5: Update Route Files

You'll need to update all route files in your application. Here's a checklist:

- [ ] `routes/auth.ts` - User authentication
- [ ] `routes/bloomspaces.ts` - Bloom space management
- [ ] `routes/dashboard.ts` - Dashboard queries
- [ ] `routes/events.ts` - Event CRUD
- [ ] `routes/focus.ts` - Focus sessions
- [ ] `routes/memories.ts` - Memory operations
- [ ] `routes/notes.ts` - Note management
- [ ] `routes/profile.ts` - User profile
- [ ] `routes/tasks.ts` - Task management

## Step 6: Common Patterns Reference

### Creating Records with Relations

**Prisma Connect Pattern:**
```typescript
// Create a memory with relationship to bloom space and user
const memory = await prisma.memory.create({
  data: {
    title: "Great Day",
    date: "2024-01-15",
    bloomSpace: {
      connect: { id: bloomSpaceId }
    },
    creator: {
      connect: { id: userId }
    }
  }
});
```

### Nested Creates

```typescript
// Create bloom space with members in one transaction
const bloomSpace = await prisma.bloomSpace.create({
  data: {
    name: "Our Space",
    inviteCode: "ABC123",
    creator: {
      connect: { id: userId }
    },
    members: {
      create: [
        { userId: userId }
      ]
    }
  },
  include: {
    members: {
      include: { user: true }
    }
  }
});
```

### Transactions

**Before (Drizzle):**
```typescript
await db.transaction(async (tx) => {
  await tx.insert(table1).values(...);
  await tx.insert(table2).values(...);
});
```

**After (Prisma):**
```typescript
await prisma.$transaction([
  prisma.table1.create({ data: {...} }),
  prisma.table2.create({ data: {...} })
]);

// Or with callback
await prisma.$transaction(async (tx) => {
  await tx.table1.create({ data: {...} });
  await tx.table2.create({ data: {...} });
});
```

### Count Queries

```typescript
// Count tasks
const taskCount = await prisma.task.count({
  where: {
    bloomSpaceId: spaceId,
    completed: false
  }
});
```

### Aggregations

```typescript
// Get average mood rating
const avgMood = await prisma.memory.aggregate({
  where: { bloomSpaceId: spaceId },
  _avg: {
    moodRating: true
  }
});
```

## Step 7: Testing

1. Run your test suite to ensure all database operations work correctly
2. Test each route endpoint manually
3. Verify data integrity after migration

## Step 8: Cleanup (Optional)

Once you've fully migrated and tested:

1. Remove Drizzle dependencies:
```bash
pnpm remove drizzle-orm drizzle-kit drizzle-zod
```

2. Delete Drizzle schema files:
```bash
rm -rf src/schema
rm drizzle.config.ts
```

3. Update `src/index.ts` to only export Prisma

## Useful Prisma Commands

```bash
# Open Prisma Studio (database GUI)
pnpm run prisma:studio

# Format schema file
pnpm run prisma:format

# Deploy migrations to production
pnpm run prisma:migrate:deploy

# Reset database (development only)
pnpm run prisma migrate reset
```

## Benefits of Prisma

1. **Type Safety**: Full TypeScript support with auto-generated types
2. **Relations**: Easier to work with relations using `include` and `select`
3. **Migrations**: Built-in migration system
4. **Prisma Studio**: Visual database browser
5. **Better DX**: More intuitive API
6. **Performance**: Optimized queries with relation loading

## Common Gotchas

1. **Auto-incrementing IDs**: Prisma uses `@default(autoincrement())` - don't pass `id` when creating
2. **Timestamps**: Use `DateTime` type, not `String`
3. **Relations**: Always use `connect`, `create`, or `connectOrCreate` for relations
4. **Transactions**: Use `$transaction` for atomic operations
5. **Unique constraints**: Use `findUnique` for unique fields, `findFirst` for others

## Support

If you encounter issues:
1. Check [Prisma Documentation](https://www.prisma.io/docs)
2. Review [Prisma Examples](https://github.com/prisma/prisma-examples)
3. Search [Prisma GitHub Issues](https://github.com/prisma/prisma/issues)

## Migration Checklist

- [ ] Prisma dependencies installed
- [ ] Schema.prisma created and validated
- [ ] Prisma Client generated
- [ ] Initial migration created
- [ ] Auth routes updated
- [ ] BloomSpace routes updated
- [ ] Event routes updated
- [ ] Memory routes updated
- [ ] Note routes updated
- [ ] Task routes updated
- [ ] Focus session routes updated
- [ ] Dashboard queries updated
- [ ] All tests passing
- [ ] Production deployment tested
- [ ] Drizzle dependencies removed (optional)
