import { Prisma } from "@prisma/client";

// Export all Prisma types for use throughout the application

// User Types
export type User = Prisma.UserGetPayload<{}>;
export type CreateUserInput = Prisma.UserCreateInput;
export type UpdateUserInput = Prisma.UserUpdateInput;

// BloomSpace Types
export type BloomSpace = Prisma.BloomSpaceGetPayload<{}>;
export type CreateBloomSpaceInput = Prisma.BloomSpaceCreateInput;
export type UpdateBloomSpaceInput = Prisma.BloomSpaceUpdateInput;

// Member Types
export type Member = Prisma.MemberGetPayload<{}>;
export type CreateMemberInput = Prisma.MemberCreateInput;
export type UpdateMemberInput = Prisma.MemberUpdateInput;

// Event Types
export type Event = Prisma.EventGetPayload<{}>;
export type CreateEventInput = Prisma.EventCreateInput;
export type UpdateEventInput = Prisma.EventUpdateInput;

// Availability Types
export type Availability = Prisma.AvailabilityGetPayload<{}>;
export type CreateAvailabilityInput = Prisma.AvailabilityCreateInput;
export type UpdateAvailabilityInput = Prisma.AvailabilityUpdateInput;

// Vote Types
export type Vote = Prisma.VoteGetPayload<{}>;
export type CreateVoteInput = Prisma.VoteCreateInput;
export type UpdateVoteInput = Prisma.VoteUpdateInput;

// Memory Types
export type Memory = Prisma.MemoryGetPayload<{}>;
export type CreateMemoryInput = Prisma.MemoryCreateInput;
export type UpdateMemoryInput = Prisma.MemoryUpdateInput;

// MemoryPhoto Types
export type MemoryPhoto = Prisma.MemoryPhotoGetPayload<{}>;
export type CreateMemoryPhotoInput = Prisma.MemoryPhotoCreateInput;
export type UpdateMemoryPhotoInput = Prisma.MemoryPhotoUpdateInput;

// MemoryComment Types
export type MemoryComment = Prisma.MemoryCommentGetPayload<{}>;
export type CreateMemoryCommentInput = Prisma.MemoryCommentCreateInput;
export type UpdateMemoryCommentInput = Prisma.MemoryCommentUpdateInput;

// MemoryReaction Types
export type MemoryReaction = Prisma.MemoryReactionGetPayload<{}>;
export type CreateMemoryReactionInput = Prisma.MemoryReactionCreateInput;
export type UpdateMemoryReactionInput = Prisma.MemoryReactionUpdateInput;

// Note Types
export type Note = Prisma.NoteGetPayload<{}>;
export type CreateNoteInput = Prisma.NoteCreateInput;
export type UpdateNoteInput = Prisma.NoteUpdateInput;

// Task Types
export type Task = Prisma.TaskGetPayload<{}>;
export type CreateTaskInput = Prisma.TaskCreateInput;
export type UpdateTaskInput = Prisma.TaskUpdateInput;

// BloomFlower Types
export type BloomFlower = Prisma.BloomFlowerGetPayload<{}>;
export type CreateBloomFlowerInput = Prisma.BloomFlowerCreateInput;
export type UpdateBloomFlowerInput = Prisma.BloomFlowerUpdateInput;

// FocusSession Types
export type FocusSession = Prisma.FocusSessionGetPayload<{}>;
export type CreateFocusSessionInput = Prisma.FocusSessionCreateInput;
export type UpdateFocusSessionInput = Prisma.FocusSessionUpdateInput;

// Utility types for relations
export type UserWithBloomSpaces = Prisma.UserGetPayload<{
  include: { members: { include: { bloomSpace: true } } };
}>;

export type BloomSpaceWithMembers = Prisma.BloomSpaceGetPayload<{
  include: { members: { include: { user: true } } };
}>;

export type MemoryWithDetails = Prisma.MemoryGetPayload<{
  include: {
    photos: true;
    comments: { include: { user: true } };
    reactions: { include: { user: true } };
    creator: true;
  };
}>;

export type TaskWithAssignee = Prisma.TaskGetPayload<{
  include: { assignee: true };
}>;

export type EventWithVotes = Prisma.EventGetPayload<{
  include: { votes: true };
}>;
