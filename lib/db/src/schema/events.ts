import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bloomSpacesTable } from "./bloom_spaces";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  notes: text("notes"),
  category: text("category").notNull().default("custom"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPattern: text("recurring_pattern"),
  reminderType: text("reminder_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const availabilityTable = pgTable("availability", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  userId: integer("user_id").notNull(),
  option: text("option").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

export const insertAvailabilitySchema = createInsertSchema(availabilityTable).omit({ id: true, createdAt: true });
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilityTable.$inferSelect;

export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, createdAt: true });
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votesTable.$inferSelect;
