import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bloomSpacesTable } from "./bloom_spaces";
import { usersTable } from "./users";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  content: text("content").notNull(),
  style: text("style").notNull().default("sticky"),
  isPinned: boolean("is_pinned").notNull().default(false),
  heartCount: integer("heart_count").notNull().default(0),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true, createdAt: true, heartCount: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;
