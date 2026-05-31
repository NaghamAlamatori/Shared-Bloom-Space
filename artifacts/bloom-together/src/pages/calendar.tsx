import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { useListEvents, getListEventsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateEvent, EventInputCategory } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const eventSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  category: z.nativeEnum(EventInputCategory),
  location: z.string().optional(),
  startTime: z.string().optional(),
});

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [] } = useListEvents(
    { month: currentDate.getMonth() + 1, year: currentDate.getFullYear() },
    { query: { queryKey: getListEventsQueryKey({ month: currentDate.getMonth() + 1, year: currentDate.getFullYear() }) } }
  );

  const createEventMutation = useCreateEvent();

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
      category: EventInputCategory.date,
      location: "",
      startTime: "",
    },
  });

  const onSubmit = (values: z.infer<typeof eventSchema>) => {
    createEventMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          setIsAddOpen(false);
          toast({ title: "Event created!" });
          form.reset();
        },
        onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
      }
    );
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = monthStart; // Might need adjusting for calendar grid to start on Sunday
  const endDate = monthEnd;

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'date': return 'bg-rose-200 text-rose-800 border-rose-300';
      case 'hangout': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'study_session': return 'bg-green-100 text-green-800 border-green-200';
      case 'work_session': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'trip': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'birthday': return 'bg-fuchsia-200 text-fuchsia-800 border-fuchsia-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-primary">Calendar</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="mr-2" size={18} /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary">New Plan</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Picnic at the park" {...field} className="bg-white/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/50">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(EventInputCategory).map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.replace('_', ' ').charAt(0).toUpperCase() + cat.replace('_', ' ').slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-2xl" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? "Saving..." : "Save Event"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/20">
          <CardTitle className="font-serif text-2xl">{format(currentDate, "MMMM yyyy")}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full bg-white/50">
              <ChevronLeft size={18} />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full bg-white/50">
              <ChevronRight size={18} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 text-center border-b border-white/20 bg-primary/5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-sm font-medium text-primary/70">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[120px] divide-y divide-x divide-white/20 bg-white/20">
            {/* Adding empty cells for offset */}
            {Array.from({ length: startDate.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 bg-white/10 opacity-50" />
            ))}
            
            {days.map((day, i) => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
              return (
                <div key={day.toISOString()} className={`p-2 transition-colors hover:bg-white/40 ${isSameMonth(day, currentDate) ? '' : 'text-muted-foreground bg-white/10'}`}>
                  <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isSameDay(day, new Date()) ? 'bg-primary text-white' : ''}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                    {dayEvents.map(event => (
                      <div key={event.id} className={`text-xs p-1 px-2 rounded-md truncate border ${getCategoryColor(event.category)}`}>
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
