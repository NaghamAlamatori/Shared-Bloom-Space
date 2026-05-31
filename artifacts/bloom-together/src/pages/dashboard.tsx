import { useGetDashboardSummary, useGetMe, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, CalendarHeart, Flower2, StickyNote, Star } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: me } = useGetMe();
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey()
    }
  });

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-primary/60">Loading your garden...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-medium text-primary">
            Lovely seeing you, {me?.name?.split(' ')[0]} 🌸
          </h1>
          <p className="text-muted-foreground mt-2">Welcome to {summary?.bloomSpaceName}</p>
        </div>
        {summary?.partnerName && (
          <div className="hidden md:flex items-center gap-3 bg-white/50 px-4 py-2 rounded-full border border-primary/20 shadow-sm">
            <div className="text-sm font-medium text-foreground">with {summary.partnerName}</div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-serif font-medium border-2 border-white">
              {summary.partnerName[0]}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Heart size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Memories</p>
              <p className="text-2xl font-serif font-medium">{summary?.totalMemories || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <StickyNote size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Love Notes</p>
              <p className="text-2xl font-serif font-medium">{summary?.totalNotes || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Flower2 size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tasks</p>
              <p className="text-2xl font-serif font-medium">{summary?.completedTasks || 0}/{summary?.totalTasks || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Star size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion</p>
              <p className="text-2xl font-serif font-medium">{Math.round((summary?.taskCompletionRate || 0) * 100)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Upcoming Events */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <CalendarHeart className="w-6 h-6" /> Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary?.upcomingEvents?.length ? (
                  summary.upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/40 border border-white/60">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                        <span className="text-xs font-medium uppercase">{format(new Date(event.date), 'MMM')}</span>
                        <span className="text-lg font-serif font-medium leading-none">{format(new Date(event.date), 'd')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{event.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{event.location || event.category}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No upcoming events. Time to plan something special!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Latest Note */}
          {summary?.latestNote && (
            <Card className="bg-blush/20 border-pink-200/50 shadow-md transform rotate-1">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-muted-foreground">{format(new Date(summary.latestNote.createdAt!), 'MMM d')}</span>
                  <Heart className="w-5 h-5 text-primary fill-primary/20" />
                </div>
                <p className="font-handwriting text-2xl text-foreground leading-relaxed">
                  {summary.latestNote.content}
                </p>
                <div className="mt-4 flex justify-end">
                  <span className="text-sm text-primary/80 font-medium">- {summary.latestNote.creator?.name || 'Someone special'}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Memories */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <Heart className="w-6 h-6" /> Recent Memories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {summary?.recentMemories?.length ? (
                  summary.recentMemories.map(memory => (
                    <div key={memory.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-muted">
                      {memory.coverImageUrl ? (
                        <img src={memory.coverImageUrl} alt={memory.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center p-4 text-center">
                          <p className="font-serif text-primary/60">{memory.title}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <p className="text-white font-medium text-sm truncate">{memory.title}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 text-muted-foreground text-center py-4">Start capturing your beautiful moments together.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
