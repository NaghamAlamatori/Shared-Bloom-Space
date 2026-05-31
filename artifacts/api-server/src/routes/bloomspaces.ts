import { Router } from "express";
import { db } from "@workspace/db";
import { bloomSpacesTable, membersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { CreateBloomSpaceBody, JoinBloomSpaceBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, bio: u.bio, favoriteFlower: u.favoriteFlower, favoriteActivity: u.favoriteActivity, createdAt: u.createdAt?.toISOString() };
}

async function getBloomSpaceWithMembers(id: number) {
  const [space] = await db.select().from(bloomSpacesTable).where(eq(bloomSpacesTable.id, id)).limit(1);
  if (!space) return null;
  const memberRows = await db.select().from(membersTable).where(eq(membersTable.bloomSpaceId, id));
  const memberUsers = await Promise.all(
    memberRows.map(async (m) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
      return u ? formatUser(u) : null;
    })
  );
  return { id: space.id, name: space.name, inviteCode: space.inviteCode, createdBy: space.createdBy, createdAt: space.createdAt?.toISOString(), members: memberUsers.filter(Boolean) };
}

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = CreateBloomSpaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const existing = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "You already belong to a Bloom Space" });
    return;
  }

  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const [space] = await db.insert(bloomSpacesTable).values({ name: parsed.data.name, inviteCode, createdBy: req.userId! }).returning();
  await db.insert(membersTable).values({ userId: req.userId!, bloomSpaceId: space.id });

  const result = await getBloomSpaceWithMembers(space.id);
  res.status(201).json(result);
});

router.post("/join", requireAuth, async (req: AuthRequest, res) => {
  const parsed = JoinBloomSpaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [space] = await db.select().from(bloomSpacesTable).where(eq(bloomSpacesTable.inviteCode, parsed.data.inviteCode.toUpperCase())).limit(1);
  if (!space) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  const alreadyMember = await db.select().from(membersTable).where(and(eq(membersTable.userId, req.userId!), eq(membersTable.bloomSpaceId, space.id))).limit(1);
  if (alreadyMember.length > 0) {
    const result = await getBloomSpaceWithMembers(space.id);
    res.json(result);
    return;
  }

  const memberCount = await db.select().from(membersTable).where(eq(membersTable.bloomSpaceId, space.id));
  if (memberCount.length >= 2) {
    res.status(400).json({ error: "Bloom Space is full" });
    return;
  }

  await db.insert(membersTable).values({ userId: req.userId!, bloomSpaceId: space.id });
  const result = await getBloomSpaceWithMembers(space.id);
  res.json(result);
});

router.get("/mine", requireAuth, async (req: AuthRequest, res) => {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
  if (!member) {
    res.status(404).json({ error: "No Bloom Space found" });
    return;
  }
  const result = await getBloomSpaceWithMembers(member.bloomSpaceId);
  if (!result) {
    res.status(404).json({ error: "Bloom Space not found" });
    return;
  }
  res.json(result);
});

router.get("/:id/members", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const memberRows = await db.select().from(membersTable).where(eq(membersTable.bloomSpaceId, id));
  const users = await Promise.all(
    memberRows.map(async (m) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
      return u ? formatUser(u) : null;
    })
  );
  res.json(users.filter(Boolean));
});

// Update nickname for partner
router.patch("/nickname", requireAuth, async (req: AuthRequest, res) => {
  const { nickname } = req.body;
  
  if (typeof nickname !== 'string') {
    res.status(400).json({ error: "Nickname must be a string" });
    return;
  }

  // Get user's bloom space membership
  const [member] = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
  if (!member) {
    res.status(404).json({ error: "No Bloom Space found" });
    return;
  }

  // Update the nickname
  await db.update(membersTable)
    .set({ nicknameForPartner: nickname.trim() || null })
    .where(eq(membersTable.id, member.id));

  res.json({ success: true, nickname: nickname.trim() || null });
});

// Get nickname given by partner
router.get("/my-nickname", requireAuth, async (req: AuthRequest, res) => {
  // Get user's bloom space membership
  const [myMember] = await db.select().from(membersTable).where(eq(membersTable.userId, req.userId!)).limit(1);
  if (!myMember) {
    res.status(404).json({ error: "No Bloom Space found" });
    return;
  }

  // Get partner's membership (the other member in the same bloom space)
  const [partnerMember] = await db.select().from(membersTable)
    .where(and(
      eq(membersTable.bloomSpaceId, myMember.bloomSpaceId),
      eq(membersTable.userId, req.userId!)
    ))
    .limit(1);

  // Get all members to find partner
  const allMembers = await db.select().from(membersTable)
    .where(eq(membersTable.bloomSpaceId, myMember.bloomSpaceId));
  
  const partner = allMembers.find(m => m.userId !== req.userId!);
  
  res.json({ 
    myNicknameFromPartner: partner?.nicknameForPartner || null,
    nicknameIGavePartner: myMember.nicknameForPartner || null
  });
});

export default router;
