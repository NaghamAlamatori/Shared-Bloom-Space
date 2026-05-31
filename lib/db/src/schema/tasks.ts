import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bloomSpacesTable } from "./bloom_spaces";
import { usersTable } from "./users";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  dueDate: text("due_date"),
  category: text("category").notNull().default("personal"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bloomFlowersTable = pgTable("bloom_flowers", {
  id: serial("id").primaryKey(),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  earnedBy: integer("earned_by").notNull().references(() => usersTable.id),
  flowerType: text("flower_type").notNull(),
  gifted: boolean("gifted").notNull().default(false),
  giftedTo: integer("gifted_to").references(() => usersTable.id),
  giftMessage: text("gift_message"),
  giftedAt: timestamp("gifted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const focusSessionsTable = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  type: text("type").notNull().default("study"),
  duration: integer("duration"),
  notes: text("notes"),
  startedBy: integer("started_by").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, completedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;

export const insertBloomFlowerSchema = createInsertSchema(bloomFlowersTable).omit({ id: true, createdAt: true });
export type InsertBloomFlower = z.infer<typeof insertBloomFlowerSchema>;
export type BloomFlower = typeof bloomFlowersTable.$inferSelect;

export const insertFocusSessionSchema = createInsertSchema(focusSessionsTable).omit({ id: true, startedAt: true });
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
