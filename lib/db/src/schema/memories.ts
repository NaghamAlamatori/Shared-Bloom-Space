import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bloomSpacesTable } from "./bloom_spaces";
import { usersTable } from "./users";

export const memoriesTable = pgTable("memories", {
  id: serial("id").primaryKey(),
  bloomSpaceId: integer("bloom_space_id").notNull().references(() => bloomSpacesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  location: text("location"),
  activityType: text("activity_type"),
  favoriteMoment: text("favorite_moment"),
  partnerFavoriteMoment: text("partner_favorite_moment"),
  moodRating: integer("mood_rating"),
  coverImageUrl: text("cover_image_url"),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memoryPhotosTable = pgTable("memory_photos", {
  id: serial("id").primaryKey(),
  memoryId: integer("memory_id").notNull().references(() => memoriesTable.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memoryCommentsTable = pgTable("memory_comments", {
  id: serial("id").primaryKey(),
  memoryId: integer("memory_id").notNull().references(() => memoriesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memoryReactionsTable = pgTable("memory_reactions", {
  id: serial("id").primaryKey(),
  memoryId: integer("memory_id").notNull().references(() => memoriesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  reactionType: text("reaction_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemorySchema = createInsertSchema(memoriesTable).omit({ id: true, createdAt: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoriesTable.$inferSelect;

export const insertMemoryPhotoSchema = createInsertSchema(memoryPhotosTable).omit({ id: true, createdAt: true });
export type InsertMemoryPhoto = z.infer<typeof insertMemoryPhotoSchema>;
export type MemoryPhoto = typeof memoryPhotosTable.$inferSelect;

export const insertMemoryCommentSchema = createInsertSchema(memoryCommentsTable).omit({ id: true, createdAt: true });
export type InsertMemoryComment = z.infer<typeof insertMemoryCommentSchema>;
export type MemoryComment = typeof memoryCommentsTable.$inferSelect;

export const insertMemoryReactionSchema = createInsertSchema(memoryReactionsTable).omit({ id: true, createdAt: true });
export type InsertMemoryReaction = z.infer<typeof insertMemoryReactionSchema>;
export type MemoryReaction = typeof memoryReactionsTable.$inferSelect;
