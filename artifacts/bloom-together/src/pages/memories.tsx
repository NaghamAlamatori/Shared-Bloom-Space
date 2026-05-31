import { useState, useRef, useCallback } from "react";
import {
  useListMemories, getListMemoriesQueryKey,
  useCreateMemory, useUpdateMemory, useDeleteMemory,
  useAddMemoryPhoto, useDeleteMemoryPhoto,
  useAddMemoryComment, useDeleteMemoryComment,
  useToggleMemoryReaction,
  getSearchMemoriesQueryKey, searchMemories,
  type Memory, type MemoryPhoto, type MemoryComment, type MemoryReaction,
  useGetMe, useGetMyBloomSpace,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  Plus, Search, MapPin, Calendar, Image as ImageIcon, X, Upload,
  Heart, Flower, ChevronLeft, ChevronRight, Trash2, MessageCircle,
  Printer, Star, Loader2, Camera,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FullMemory = Memory & {
  photos?: MemoryPhoto[];
  comments?: MemoryComment[];
  reactions?: MemoryReaction[];
  creator?: { id: number; name: string; avatarUrl?: string | null } | null;
  partner?: { id: number; name: string; avatarUrl?: string | null } | null;
};

const ACTIVITY_TYPES = [
  "Date Night", "Trip", "Adventure", "Celebration", "Cozy Day",
  "First Time", "Anniversary", "Spontaneous", "Holiday", "Other",
];

const REACTION_EMOJIS: Record<string, string> = {
  rose: "🌹", peony: "🌸", tulip: "🌷", daisy: "🌼", heart: "💖",
};

// ─── Mood Flowers ─────────────────────────────────────────────────────────────
function MoodFlowers({ rating, onRate }: { rating?: number | null; onRate?: (n: number) => void }) {
  const r = rating ?? 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onRate?.(n)}
          className={`text-base leading-none transition-transform hover:scale-125 ${onRate ? "cursor-pointer" : "cursor-default"}`}
        >
          {n <= r ? "🌸" : "🤍"}
        </button>
      ))}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 7 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name} className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-white`} />
  );
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center ring-2 ring-white`}>
      {initials}
    </div>
  );
}

// ─── Photo Upload Hook ────────────────────────────────────────────────────────
function usePhotoUpload() {
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  return { fileToBase64 };
}

// ─── Memory Card (Polaroid) ───────────────────────────────────────────────────
function MemoryCard({ memory, onClick }: { memory: FullMemory; onClick: () => void }) {
  const photoCount = memory.photos?.length ?? 0;
  const coverSrc = memory.coverImageUrl || memory.photos?.[0]?.imageUrl;

  return (
    <div
      onClick={onClick}
      className="break-inside-avoid cursor-pointer group mb-5 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="bg-white rounded-2xl shadow-md shadow-pink-100/50 border border-pink-100/60 overflow-hidden hover:shadow-xl transition-shadow">
        {/* Tape decoration */}
        <div className="relative h-2">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-4 bg-yellow-100/70 border border-yellow-200/50 rounded-sm rotate-1 shadow-sm" />
        </div>

        {/* Cover photo */}
        <div className="mx-3 mt-4 rounded-xl overflow-hidden bg-secondary/30">
          {coverSrc ? (
            <img src={coverSrc} alt={memory.title} className="w-full h-44 object-cover group-hover:scale-102 transition-transform duration-500" />
          ) : (
            <div className="w-full h-44 flex items-center justify-center text-primary/20">
              <Camera size={40} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 pb-4 pt-2 space-y-1.5">
          <h3 className="font-handwriting text-xl text-foreground text-center leading-tight truncate">{memory.title}</h3>

          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Calendar size={10} />{format(new Date(memory.date), "MMM d, yyyy")}
            </span>
            {memory.location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={10} />{memory.location}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <MoodFlowers rating={memory.moodRating} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {photoCount > 0 && (
                <span className="flex items-center gap-0.5"><ImageIcon size={10} />{photoCount}</span>
              )}
              {(memory.comments?.length ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 ml-1"><MessageCircle size={10} />{memory.comments!.length}</span>
              )}
            </div>
          </div>

          {/* Avatars */}
          <div className="flex -space-x-2 pt-0.5">
            {memory.creator && <Avatar name={memory.creator.name} avatarUrl={memory.creator.avatarUrl} size={6} />}
            {memory.partner && <Avatar name={memory.partner.name} avatarUrl={memory.partner.avatarUrl} size={6} />}
          </div>

          {/* Favorite moment preview */}
          {memory.favoriteMoment && (
            <p className="text-xs text-muted-foreground italic line-clamp-2 pt-0.5 font-handwriting">
              "{memory.favoriteMoment.slice(0, 80)}{memory.favoriteMoment.length > 80 ? "…" : ""}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Photo Gallery (in detail view) ──────────────────────────────────────────
function PhotoGallery({
  photos, memoryId, canEdit, onDeletePhoto, onCaptionSave,
}: {
  photos: MemoryPhoto[];
  memoryId: number;
  canEdit: boolean;
  onDeletePhoto: (photoId: number) => void;
  onCaptionSave: (photoId: number, caption: string) => void;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState<{ id: number; value: string } | null>(null);
  const current = lightbox !== null ? photos[lightbox] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden bg-secondary/20 aspect-square cursor-pointer"
            onClick={() => setLightbox(i)}>
            <img src={p.imageUrl} alt={p.caption ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            {p.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-2 py-1 truncate font-handwriting">{p.caption}</div>
            )}
            {canEdit && (
              <button onClick={e => { e.stopPropagation(); onDeletePhoto(p.id); }}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 items-center justify-center hidden group-hover:flex hover:bg-red-500 transition-colors">
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && current && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={e => { e.stopPropagation(); setLightbox(i => Math.max(0, (i ?? 1) - 1)); }}
            className="absolute left-4 text-white/70 hover:text-white" disabled={lightbox === 0}>
            <ChevronLeft size={36} />
          </button>
          <div className="max-w-3xl max-h-[85vh] mx-12 relative" onClick={e => e.stopPropagation()}>
            <img src={current.imageUrl} alt={current.caption ?? ""} className="max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl" />
            {editCaption?.id === current.id ? (
              <div className="mt-2 flex gap-2">
                <input className="flex-1 bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg border border-white/30 focus:outline-none"
                  value={editCaption.value}
                  onChange={e => setEditCaption({ id: current.id, value: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") { onCaptionSave(current.id, editCaption.value); setEditCaption(null); } if (e.key === "Escape") setEditCaption(null); }}
                  autoFocus
                />
                <button onClick={() => { onCaptionSave(current.id, editCaption.value); setEditCaption(null); }}
                  className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm">Save</button>
              </div>
            ) : (
              <p className="text-white/70 text-center text-sm mt-2 font-handwriting cursor-pointer hover:text-white"
                onClick={() => setEditCaption({ id: current.id, value: current.caption ?? "" })}>
                {current.caption || (canEdit ? "Add caption…" : "")}
              </p>
            )}
          </div>
          <button onClick={e => { e.stopPropagation(); setLightbox(i => Math.min(photos.length - 1, (i ?? 0) + 1)); }}
            className="absolute right-4 text-white/70 hover:text-white" disabled={lightbox === photos.length - 1}>
            <ChevronRight size={36} />
          </button>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Memory Detail Dialog ─────────────────────────────────────────────────────
function MemoryDetailDialog({
  memory, userId, open, onClose, onEdit, onDeleted,
}: {
  memory: FullMemory;
  userId: number;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const deletePhotoMutation = useDeleteMemoryPhoto();
  const addCommentMutation = useAddMemoryComment();
  const deleteCommentMutation = useDeleteMemoryComment();
  const reactMutation = useToggleMemoryReaction();
  const deleteMutation = useDeleteMemory();

  const invalidate = useCallback(() =>
    qc.invalidateQueries({ queryKey: getListMemoriesQueryKey() }), [qc]);

  const handleDeletePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(
      { memoryId: memory.id, photoId },
      { onSuccess: invalidate, onError: () => toast({ title: "Failed to delete photo", variant: "destructive" }) }
    );
  };

  const handleCaptionSave = (_photoId: number, _caption: string) => {
    // Caption update - just invalidate to refresh
    invalidate();
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(
      { id: memory.id, data: { content: commentText.trim() } },
      {
        onSuccess: () => { setCommentText(""); invalidate(); },
        onError: () => toast({ title: "Failed to add comment", variant: "destructive" }),
      }
    );
  };

  const handleDeleteComment = (commentId: number) => {
    deleteCommentMutation.mutate(
      { id: memory.id, commentId },
      { onSuccess: invalidate }
    );
  };

  const handleReact = (reactionType: string) => {
    reactMutation.mutate(
      { id: memory.id, data: { reactionType: reactionType as any } },
      { onSuccess: invalidate }
    );
  };

  const handleDelete = () => {
    if (!confirm("Delete this memory permanently?")) return;
    deleteMutation.mutate(
      { id: memory.id },
      {
        onSuccess: () => { invalidate(); onDeleted(); toast({ title: "Memory deleted" }); },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      }
    );
  };

  const handlePrint = () => window.print();

  const myReactions = (memory.reactions ?? []).filter(r => r.userId === userId).map(r => r.reactionType);

  const reactionCounts = (memory.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.reactionType] = (acc[r.reactionType] ?? 0) + 1;
    return acc;
  }, {});

  const creatorName = memory.creator?.name ?? "Partner A";
  const partnerName = memory.partner?.name ?? "Partner B";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-none shadow-2xl print:shadow-none">
        <div className="relative bg-gradient-to-b from-pink-50/80 to-white min-h-full rounded-3xl overflow-hidden print:bg-white" id="memory-print-area">

          {/* Floral border top */}
          <div className="h-8 bg-gradient-to-r from-pink-200/50 via-rose-100/30 to-pink-200/50 flex items-center justify-center gap-2 text-lg select-none print:hidden">
            🌸 🌹 🌷 🌸 🌹 🌷 🌸
          </div>

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h2 className="font-handwriting text-3xl text-foreground leading-tight">{memory.title}</h2>
                <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={13} />{format(new Date(memory.date), "MMMM d, yyyy")}</span>
                  {memory.location && <span className="flex items-center gap-1"><MapPin size={13} />{memory.location}</span>}
                  {memory.activityType && (
                    <span className="bg-secondary/50 text-foreground/70 text-xs px-2 py-0.5 rounded-full">{memory.activityType}</span>
                  )}
                </div>
                <div className="mt-2"><MoodFlowers rating={memory.moodRating} /></div>
              </div>
              <div className="flex items-center gap-1.5 print:hidden">
                <button onClick={onEdit} className="text-xs bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-xl transition-colors">Edit</button>
                <button onClick={handlePrint} className="text-primary/60 hover:text-primary p-1.5 rounded-xl hover:bg-secondary/50 transition-colors"><Printer size={15} /></button>
                <button onClick={handleDelete} className="text-destructive/60 hover:text-destructive p-1.5 rounded-xl hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>

            {/* Story */}
            {memory.description && (
              <div className="bg-white/80 rounded-2xl p-4 border border-pink-100/60">
                <p className="text-sm text-foreground/80 leading-relaxed">{memory.description}</p>
              </div>
            )}

            {/* Photo Gallery */}
            {(memory.photos?.length ?? 0) > 0 && (
              <div>
                <h3 className="font-serif text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ImageIcon size={13} /> Photos
                </h3>
                <PhotoGallery
                  photos={memory.photos!}
                  memoryId={memory.id}
                  canEdit={memory.createdBy === userId}
                  onDeletePhoto={handleDeletePhoto}
                  onCaptionSave={handleCaptionSave}
                />
              </div>
            )}

            {/* Our Favorite Moments */}
            {(memory.favoriteMoment || memory.partnerFavoriteMoment) && (
              <div>
                <h3 className="font-serif text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Star size={13} className="text-primary" /> Our Favorite Moments
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {memory.favoriteMoment && (
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50/50 rounded-2xl p-4 border border-pink-100/60">
                      <div className="flex items-center gap-2 mb-2">
                        {memory.creator && <Avatar name={memory.creator.name} avatarUrl={memory.creator.avatarUrl} size={6} />}
                        <span className="text-xs font-medium text-foreground/70">{creatorName}'s Favorite</span>
                      </div>
                      <p className="text-sm text-foreground/80 italic leading-relaxed font-handwriting">"{memory.favoriteMoment}"</p>
                    </div>
                  )}
                  {memory.partnerFavoriteMoment && (
                    <div className="bg-gradient-to-br from-purple-50/60 to-pink-50/40 rounded-2xl p-4 border border-purple-100/40">
                      <div className="flex items-center gap-2 mb-2">
                        {memory.partner && <Avatar name={memory.partner.name} avatarUrl={memory.partner.avatarUrl} size={6} />}
                        <span className="text-xs font-medium text-foreground/70">{partnerName}'s Favorite</span>
                      </div>
                      <p className="text-sm text-foreground/80 italic leading-relaxed font-handwriting">"{memory.partnerFavoriteMoment}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reactions */}
            <div className="print:hidden">
              <div className="flex flex-wrap gap-2">
                {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => {
                  const count = reactionCounts[type] ?? 0;
                  const active = myReactions.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => handleReact(type)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-sm border transition-all ${
                        active
                          ? "bg-primary/10 border-primary/30 text-primary font-medium scale-105"
                          : "bg-white/60 border-pink-100/60 hover:bg-secondary/40 text-foreground/70"
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-xs">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="print:hidden">
              <h3 className="font-serif text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <MessageCircle size={13} /> Comments {(memory.comments?.length ?? 0) > 0 && `(${memory.comments!.length})`}
              </h3>
              <div className="space-y-2 mb-3">
                {(memory.comments ?? []).map(c => (
                  <div key={c.id} className="flex items-start gap-2 bg-white/70 rounded-xl p-3 border border-pink-50">
                    {c.author && <Avatar name={c.author.name} avatarUrl={(c.author as any).avatarUrl} size={6} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-medium text-foreground/70">{c.author?.name ?? "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d")}</span>
                      </div>
                      <p className="text-sm text-foreground/80">{c.content}</p>
                    </div>
                    {c.userId === userId && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                  placeholder="Leave a comment…"
                  className="flex-1 text-sm bg-white/70 border border-pink-100/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {addCommentMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Post"}
                </button>
              </div>
            </div>
          </div>

          {/* Floral border bottom */}
          <div className="h-8 bg-gradient-to-r from-pink-200/50 via-rose-100/30 to-pink-200/50 flex items-center justify-center gap-2 text-lg select-none print:hidden">
            🌷 🌸 🌹 🌷 🌸 🌹 🌷
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit Memory Dialog ──────────────────────────────────────────────
function CreateEditMemoryDialog({
  open, onClose, existing, userId, yourUsername, partnerUsername,
}: {
  open: boolean;
  onClose: () => void;
  existing?: FullMemory | null;
  userId: number;
  yourUsername: string;
  partnerUsername: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { fileToBase64 } = usePhotoUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(existing?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [location, setLocation] = useState(existing?.location ?? "");
  const [activityType, setActivityType] = useState(existing?.activityType ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [moodRating, setMoodRating] = useState(existing?.moodRating ?? 5);
  const [favoriteMoment, setFavoriteMoment] = useState(existing?.favoriteMoment ?? "");
  const [partnerFavoriteMoment, setPartnerFavoriteMoment] = useState(existing?.partnerFavoriteMoment ?? "");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<{ url: string; caption: string }[]>([]);

  const createMutation = useCreateMemory();
  const updateMutation = useUpdateMemory();
  const addPhotoMutation = useAddMemoryPhoto();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListMemoriesQueryKey() });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingPhotos(true);
    const results: { url: string; caption: string }[] = [];
    for (const file of files) {
      const url = await fileToBase64(file);
      results.push({ url, caption: "" });
    }
    setPendingPhotos(prev => [...prev, ...results]);
    setUploadingPhotos(false);
    e.target.value = "";
  };

  const removePendingPhoto = (i: number) => {
    setPendingPhotos(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      date,
      location: location.trim() || undefined,
      activityType: activityType || undefined,
      description: description.trim() || undefined,
      moodRating,
      favoriteMoment: favoriteMoment.trim() || undefined,
      partnerFavoriteMoment: partnerFavoriteMoment.trim() || undefined,
      coverImageUrl: existing?.coverImageUrl || pendingPhotos[0]?.url || undefined,
    };

    if (existing) {
      updateMutation.mutate(
        { id: existing.id, data },
        {
          onSuccess: async (updated) => {
            // Upload any newly added photos
            for (const p of pendingPhotos) {
              await addPhotoMutation.mutateAsync({
                id: updated.id,
                data: { imageUrl: p.url, caption: p.caption || undefined }
              });
            }
            invalidate();
            toast({ title: "Memory updated!" });
            onClose();
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: async (created) => {
            for (let i = 0; i < pendingPhotos.length; i++) {
              const p = pendingPhotos[i];
              await addPhotoMutation.mutateAsync({
                id: created.id,
                data: { imageUrl: p.url, caption: p.caption || undefined, sortOrder: i }
              });
            }
            // If we uploaded photos and need to set cover
            if (pendingPhotos.length > 0) {
              await updateMutation.mutateAsync({
                id: created.id,
                data: { coverImageUrl: pendingPhotos[0].url }
              });
            }
            invalidate();
            toast({ title: "Memory saved! 🌸" });
            onClose();
          },
          onError: () => toast({ title: "Failed to save", variant: "destructive" }),
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = "w-full rounded-xl border border-pink-200/60 bg-white/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/60";
  const labelCls = "block text-xs font-medium text-foreground/70 mb-1";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-0">
        <div className="bg-gradient-to-b from-pink-50/80 to-white rounded-3xl">
          <div className="h-6 bg-gradient-to-r from-pink-200/50 via-rose-100/30 to-pink-200/50 rounded-t-3xl flex items-center justify-center gap-1 text-sm select-none">
            🌸 🌹 🌷
          </div>
          <div className="p-5">
            <h2 className="font-handwriting text-2xl text-primary mb-4 text-center">
              {existing ? "Edit Memory" : "Capture a Moment"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className={labelCls}>Title *</label>
                <input className={inputCls} placeholder="A magical evening…" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>Activity Type</label>
                  <select className={inputCls} value={activityType} onChange={e => setActivityType(e.target.value)}>
                    <option value="">Choose…</option>
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} placeholder="Where were you?" value={location} onChange={e => setLocation(e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Story / Description</label>
                <textarea className={inputCls + " min-h-[80px] resize-none"} placeholder="Tell the story of this memory…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* Mood */}
              <div>
                <label className={labelCls}>Mood Rating</label>
                <MoodFlowers rating={moodRating} onRate={setMoodRating} />
              </div>

              {/* Favorite Moments */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>✨ {yourUsername}'s Favorite Moment</label>
                  <textarea className={inputCls + " min-h-[70px] resize-none font-handwriting"} placeholder="What was your favorite part?" value={favoriteMoment} onChange={e => setFavoriteMoment(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>💝 {partnerUsername}'s Favorite Moment</label>
                  <textarea className={inputCls + " min-h-[70px] resize-none font-handwriting"} placeholder="What was their favorite part?" value={partnerFavoriteMoment} onChange={e => setPartnerFavoriteMoment(e.target.value)} />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className={labelCls}>Photos</label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

                {/* Existing photos */}
                {existing?.photos && existing.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {existing.photos.map(p => (
                      <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-pink-100">
                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20" />
                        <Camera size={10} className="absolute top-1 left-1 text-white/70" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending new photos */}
                {pendingPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {pendingPhotos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-primary/30">
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePendingPhoto(i)}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-pink-200 rounded-xl py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
                  {uploadingPhotos ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingPhotos ? "Processing…" : "Upload Photos"}
                </button>
              </div>

              <button type="submit" disabled={isPending || !title.trim()}
                className="w-full bg-primary text-white rounded-2xl py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors mt-2">
                {isPending ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving…</span>
                ) : existing ? "Save Changes" : "Save Memory 🌸"}
              </button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Memories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  
  const { data: me } = useGetMe();
  const { data: space } = useGetMyBloomSpace();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [detailMemory, setDetailMemory] = useState<FullMemory | null>(null);
  const [editMemory, setEditMemory] = useState<FullMemory | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: memories = [], isLoading } = useListMemories(undefined, { query: { queryKey: getListMemoriesQueryKey() } });
  
  // Get partner name from memories or space
  const partnerName = (memories as FullMemory[]).find(m => m.partner)?.partner?.name || space?.members?.find(m => m.id !== user?.id)?.name || "Partner";

  // Client-side search filter (fast, no extra API call)
  const filteredMemories = debouncedQ
    ? (memories as FullMemory[]).filter(m => {
        const q = debouncedQ.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          (m.location ?? "").toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q) ||
          (m.favoriteMoment ?? "").toLowerCase().includes(q) ||
          (m.partnerFavoriteMoment ?? "").toLowerCase().includes(q)
        );
      })
    : (memories as FullMemory[]);

  const handleSearchChange = (v: string) => {
    setSearchQuery(v);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedQ(v), 300);
  };

  // When detail memory is opened, find the most up-to-date version
  const currentDetailMemory = detailMemory
    ? (memories as FullMemory[]).find(m => m.id === detailMemory.id) ?? detailMemory
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-primary">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading your scrapbook…
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary">Scrapbook</h1>
          <p className="text-sm text-muted-foreground">{memories.length} memor{memories.length === 1 ? "y" : "ies"} together</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-2xl text-sm font-medium hover:bg-primary/90 shadow-md shadow-primary/20 transition-all hover:shadow-lg"
        >
          <Plus size={16} /> New Memory
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search by title, location, story, or favorite moments…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-pink-200/60 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setDebouncedQ(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {debouncedQ && (
        <p className="text-xs text-muted-foreground">
          {filteredMemories.length} result{filteredMemories.length !== 1 ? "s" : ""} for "{debouncedQ}"
        </p>
      )}

      {/* Masonry Grid */}
      {filteredMemories.length > 0 ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {filteredMemories.map(m => (
            <MemoryCard
              key={m.id}
              memory={m}
              onClick={() => setDetailMemory(m)}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3">
          <div className="text-5xl">🌸</div>
          <p className="text-muted-foreground font-serif text-lg">
            {debouncedQ ? "No memories match your search." : "Your scrapbook is waiting."}
          </p>
          {!debouncedQ && (
            <button
              onClick={() => setCreateOpen(true)}
              className="text-primary text-sm hover:underline"
            >
              Add your first memory together →
            </button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <CreateEditMemoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        userId={user?.id ?? 0}
        yourUsername={me?.name || "You"}
        partnerUsername={partnerName}
      />

      {/* Edit Dialog */}
      {editMemory && (
        <CreateEditMemoryDialog
          open={!!editMemory}
          onClose={() => setEditMemory(null)}
          existing={editMemory}
          userId={user?.id ?? 0}
          yourUsername={me?.name || "You"}
          partnerUsername={partnerName}
        />
      )}

      {/* Detail Dialog */}
      {currentDetailMemory && (
        <MemoryDetailDialog
          memory={currentDetailMemory}
          userId={user?.id ?? 0}
          open={!!detailMemory}
          onClose={() => setDetailMemory(null)}
          onEdit={() => { setEditMemory(currentDetailMemory); setDetailMemory(null); }}
          onDeleted={() => setDetailMemory(null)}
        />
      )}
    </div>
  );
}
