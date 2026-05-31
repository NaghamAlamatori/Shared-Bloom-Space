import { useState } from "react";
import {
  useListTasks,
  getListTasksQueryKey,
  useCreateTask,
  useCompleteTask,
  useGetTaskStats,
  getGetTaskStatsQueryKey,
  useListBloomFlowers,
  getListBloomFlowersQueryKey,
  useGiftBloomFlower,
  TaskInputCategory,
  BloomFlowerFlowerType,
  type BloomFlower,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Plus, Gift, Flower2, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

const FLOWER_EMOJI: Record<string, string> = {
  rose: "🌹",
  peony: "🌸",
  tulip: "🌷",
  daisy: "🌼",
  cherry_blossom: "🌸",
};

const FLOWER_LABEL: Record<string, string> = {
  rose: "Rose",
  peony: "Peony",
  tulip: "Tulip",
  daisy: "Daisy",
  cherry_blossom: "Cherry Blossom",
};

const CATEGORY_EMOJI: Record<string, string> = {
  personal: "🏡",
  study: "📚",
  work: "💼",
  travel: "✈️",
  relationship: "💕",
  custom: "✨",
};

function ProgressStem({ current, of = 4, label }: { current: number; of?: number; label: string }) {
  const petals = Array.from({ length: of }, (_, i) => i < current);
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1 items-center">
        {petals.map((filled, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border transition-all duration-500 ${
              filled
                ? "bg-primary border-primary scale-110 shadow-sm shadow-primary/30"
                : "bg-white/30 border-primary/30"
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-semibold text-primary">{current}/{of}</span>
      </div>
      <p className="text-xs text-muted-foreground">{of - current} more to bloom</p>
    </div>
  );
}

function FlowerCard({
  flower,
  isOwn,
  onGift,
}: {
  flower: BloomFlower;
  isOwn: boolean;
  onGift: (flower: BloomFlower) => void;
}) {
  const emoji = FLOWER_EMOJI[flower.flowerType] ?? "🌸";
  const label = FLOWER_LABEL[flower.flowerType] ?? flower.flowerType;

  return (
    <div
      className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all hover:scale-105 ${
        flower.gifted
          ? "bg-pink-50/60 border-pink-200/60"
          : "bg-white/50 border-primary/20 hover:border-primary/40 cursor-pointer"
      }`}
      onClick={() => !flower.gifted && isOwn && onGift(flower)}
      title={flower.gifted ? (flower.giftMessage ?? `Gifted to ${flower.recipient?.name}`) : "Click to gift"}
    >
      <span className="text-3xl animate-in zoom-in duration-500">{emoji}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {flower.gifted ? (
        <span className="text-[10px] text-pink-400 font-medium">Gifted 💝</span>
      ) : isOwn ? (
        <span className="text-[10px] text-primary/60">Tap to gift</span>
      ) : (
        <span className="text-[10px] text-muted-foreground">Earned</span>
      )}
    </div>
  );
}

function GiftDialog({
  flower,
  open,
  onOpenChange,
  onGift,
  isPending,
}: {
  flower: BloomFlower | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGift: (message: string) => void;
  isPending: boolean;
}) {
  const [message, setMessage] = useState("");

  if (!flower) return null;
  const emoji = FLOWER_EMOJI[flower.flowerType] ?? "🌸";
  const label = FLOWER_LABEL[flower.flowerType] ?? flower.flowerType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary text-center">
            Gift a {label} {emoji}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="text-6xl animate-in zoom-in duration-500">{emoji}</div>
          <p className="text-sm text-muted-foreground text-center">
            Send this flower to your partner with a sweet note.
          </p>
          <Textarea
            placeholder="A little note... (optional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="bg-white/50 resize-none"
            rows={3}
          />
          <Button
            className="w-full rounded-2xl"
            onClick={() => { onGift(message); setMessage(""); }}
            disabled={isPending}
          >
            <Gift size={16} className="mr-2" />
            {isPending ? "Sending..." : "Send with Love 💕"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Tasks() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [giftFlower, setGiftFlower] = useState<BloomFlower | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskCategory, setTaskCategory] = useState<string>(TaskInputCategory.personal);
  const [taskDue, setTaskDue] = useState("");
  const [taskAssign, setTaskAssign] = useState<"me" | "partner">("me");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tasks = [] } = useListTasks(undefined, { query: { queryKey: getListTasksQueryKey() } });
  const { data: stats } = useGetTaskStats({ query: { queryKey: getGetTaskStatsQueryKey() } });
  const { data: flowers = [] } = useListBloomFlowers({ query: { queryKey: getListBloomFlowersQueryKey() } });

  const createTaskMutation = useCreateTask();
  const completeTaskMutation = useCompleteTask();
  const giftMutation = useGiftBloomFlower();

  const partnerId = tasks
    .filter(t => t.assignedTo !== user?.id && t.assignee)
    .map(t => t.assignedTo)[0];
  const partnerName = tasks
    .filter(t => t.assignedTo !== user?.id && t.assignee)
    .map(t => t.assignee?.name)[0] ?? "Partner";

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListBloomFlowersQueryKey() });
  };

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    const assignedTo = taskAssign === "me" ? user?.id : partnerId;
    if (!assignedTo) {
      toast({ title: "Your partner hasn't joined yet!", variant: "destructive" });
      return;
    }
    createTaskMutation.mutate(
      {
        data: {
          title: taskTitle,
          description: taskDesc || undefined,
          assignedTo,
          category: taskCategory as typeof TaskInputCategory[keyof typeof TaskInputCategory],
          dueDate: taskDue || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidateAll();
          setIsAddOpen(false);
          setTaskTitle(""); setTaskDesc(""); setTaskDue("");
          setTaskCategory(TaskInputCategory.personal);
          setTaskAssign("me");
          toast({ title: "🌱 Task planted!" });
        },
        onError: () => toast({ title: "Failed to add task", variant: "destructive" }),
      }
    );
  };

  const handleToggle = (id: number, assignedTo?: number | null) => {
    if (assignedTo && assignedTo !== user?.id) {
      toast({ title: "That's your partner's task to complete 💕", variant: "default" });
      return;
    }
    completeTaskMutation.mutate(
      { id },
      {
        onSuccess: result => {
          invalidateAll();
          if (result.newFlower) {
            const emoji = FLOWER_EMOJI[result.newFlower.flowerType] ?? "🌸";
            const label = FLOWER_LABEL[result.newFlower.flowerType] ?? result.newFlower.flowerType;
            toast({
              title: `${emoji} A ${label} has bloomed!`,
              description: "You earned a flower for your garden. Gift it to your partner!",
            });
          }
        },
        onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
      }
    );
  };

  const handleGift = (message: string) => {
    if (!giftFlower) return;
    giftMutation.mutate(
      { flowerId: giftFlower.id, data: { message: message || null } },
      {
        onSuccess: () => {
          invalidateAll();
          setGiftFlower(null);
          const emoji = FLOWER_EMOJI[giftFlower.flowerType] ?? "🌸";
          toast({ title: `${emoji} Flower gifted to your partner!`, description: message || undefined });
        },
        onError: () => toast({ title: "Failed to gift flower", variant: "destructive" }),
      }
    );
  };

  const myTasks = tasks.filter(t => t.assignedTo === user?.id || !t.assignedTo);
  const partnerTasks = tasks.filter(t => t.assignedTo && t.assignedTo !== user?.id);

  const myFlowers = flowers.filter(f => f.earnedBy === user?.id);
  const partnerFlowers = flowers.filter(f => f.earnedBy !== user?.id);
  const myUngifted = myFlowers.filter(f => !f.gifted);
  const giftsReceived = flowers.filter(f => f.giftedTo === user?.id);

  const myProgress = stats?.myProgress?.progressToNext ?? 0;
  const partnerProgress = stats?.partnerProgress?.progressToNext ?? 0;

  const categories = Object.values(TaskInputCategory);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-primary">Shared Garden</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-md">
              <Plus className="mr-2" size={18} /> Plant Task
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary">Plant a new seed 🌱</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">What needs to grow?</label>
                <Input
                  placeholder="Read a book together..."
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="bg-white/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Details (optional)</label>
                <Input
                  placeholder="Any notes?"
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  className="bg-white/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Assign to</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskAssign("me")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      taskAssign === "me"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white/50 border-primary/20 hover:border-primary/40"
                    }`}
                  >
                    🙋 Me
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskAssign("partner")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      taskAssign === "partner"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white/50 border-primary/20 hover:border-primary/40"
                    }`}
                  >
                    💕 {partnerName}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <select
                    value={taskCategory}
                    onChange={e => setTaskCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl text-sm bg-white/50 border border-primary/20 focus:outline-none focus:border-primary/40"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {CATEGORY_EMOJI[cat] ?? "✨"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Due date (optional)</label>
                  <Input
                    type="date"
                    value={taskDue}
                    onChange={e => setTaskDue(e.target.value)}
                    className="bg-white/50"
                  />
                </div>
              </div>
              <Button
                type="button"
                className="w-full rounded-2xl"
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending || !taskTitle.trim()}
              >
                {createTaskMutation.isPending ? "Planting..." : "🌱 Plant Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bloom Progress */}
      <Card className="glass-card overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-pink-50/60 to-rose-50/40 border-b border-primary/10">
          <h2 className="font-serif text-xl text-primary text-center mb-4">🌸 Bloom Progress</h2>
          <div className="flex justify-around items-start gap-4">
            <ProgressStem current={myProgress} label="Your Progress" />
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl">🌷</span>
              <span className="text-[10px] text-muted-foreground mt-1">every 4 tasks</span>
            </div>
            <ProgressStem current={partnerProgress} label={`${partnerName}'s Progress`} />
          </div>
        </div>
      </Card>

      {/* Bloom Garden */}
      {(myFlowers.length > 0 || giftsReceived.length > 0) && (
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-primary">Bloom Garden</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {myUngifted.length > 0 ? `You have ${myUngifted.length} flower${myUngifted.length > 1 ? "s" : ""} to gift 💝` : "Tap a flower to gift it"}
              </p>
            </div>
            <Flower2 className="text-primary/40" size={24} />
          </div>
          <CardContent className="p-4">
            {myFlowers.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your flowers</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {myFlowers.map(f => (
                    <FlowerCard key={f.id} flower={f} isOwn onGift={setGiftFlower} />
                  ))}
                </div>
              </div>
            )}
            {partnerFlowers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{partnerName}'s flowers</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {partnerFlowers.map(f => (
                    <FlowerCard key={f.id} flower={f} isOwn={false} onGift={() => {}} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <div className="space-y-4">
        {/* My Tasks */}
        <Card className="glass-card overflow-hidden">
          <div className="px-4 py-3 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
            <User size={15} className="text-primary/60" />
            <h3 className="font-medium text-primary/80">Your Tasks</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {myTasks.filter(t => t.completed).length}/{myTasks.length} done
            </span>
          </div>
          <div className="divide-y divide-white/20">
            {myTasks.length > 0 ? myTasks.map(task => (
              <div
                key={task.id}
                className="p-4 hover:bg-white/40 transition-colors flex items-center gap-3"
              >
                <button
                  onClick={() => handleToggle(task.id, task.assignedTo)}
                  className={`shrink-0 transition-all ${
                    task.completed ? "text-primary scale-110" : "text-muted-foreground hover:text-primary/60"
                  }`}
                >
                  {task.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                  )}
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">📅 {task.dueDate}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 bg-white/50 rounded-full border border-black/5 text-muted-foreground shrink-0">
                  {CATEGORY_EMOJI[task.category ?? ""] ?? "✨"} {task.category}
                </span>
              </div>
            )) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <p>No tasks assigned to you yet.</p>
                <p className="text-xs mt-1">Plant one above 🌱</p>
              </div>
            )}
          </div>
        </Card>

        {/* Partner Tasks */}
        <Card className="glass-card overflow-hidden">
          <div className="px-4 py-3 bg-rose-50/50 border-b border-primary/10 flex items-center gap-2">
            <span className="text-sm">💕</span>
            <h3 className="font-medium text-primary/80">{partnerName}'s Tasks</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {partnerTasks.filter(t => t.completed).length}/{partnerTasks.length} done
            </span>
          </div>
          <div className="divide-y divide-white/20">
            {partnerTasks.length > 0 ? partnerTasks.map(task => (
              <div
                key={task.id}
                className="p-4 flex items-center gap-3 opacity-80"
              >
                <div className={`shrink-0 ${task.completed ? "text-primary" : "text-muted-foreground"}`}>
                  {task.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">📅 {task.dueDate}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 bg-white/50 rounded-full border border-black/5 text-muted-foreground shrink-0">
                  {CATEGORY_EMOJI[task.category ?? ""] ?? "✨"} {task.category}
                </span>
              </div>
            )) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <p>No tasks for {partnerName} yet.</p>
                <p className="text-xs mt-1">Plant one and assign it to them 🌸</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Gift Dialog */}
      <GiftDialog
        flower={giftFlower}
        open={!!giftFlower}
        onOpenChange={v => !v && setGiftFlower(null)}
        onGift={handleGift}
        isPending={giftMutation.isPending}
      />
    </div>
  );
}
