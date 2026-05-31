import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bloomSpacesTable = pgTable("bloom_spaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  nicknameForPartner: text("nickname_for_partner"), // Nickname this member gave to their partner
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertBloomSpaceSchema = createInsertSchema(bloomSpacesTable).omit({ id: true, createdAt: true });
export type InsertBloomSpace = z.infer<typeof insertBloomSpaceSchema>;
export type BloomSpace = typeof bloomSpacesTable.$inferSelect;

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, joinedAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
