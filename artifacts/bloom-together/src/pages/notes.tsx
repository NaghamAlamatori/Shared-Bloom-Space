import { useState } from "react";
import { useListNotes, getListNotesQueryKey, useCreateNote, NoteInputStyle, useToggleNotePin, useReactToNote } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenLine, Heart, Pin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const noteSchema = z.object({
  content: z.string().min(1),
  style: z.nativeEnum(NoteInputStyle).optional(),
});

export default function Notes() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useListNotes();
  const createNoteMutation = useCreateNote();
  const togglePinMutation = useToggleNotePin();
  const reactMutation = useReactToNote();

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: "",
      style: NoteInputStyle.sticky,
    },
  });

  const onSubmit = (values: z.infer<typeof noteSchema>) => {
    createNoteMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          setIsAddOpen(false);
          toast({ title: "Note sent!" });
          form.reset();
        },
        onError: () => toast({ title: "Failed to send note", variant: "destructive" }),
      }
    );
  };

  const handleTogglePin = (id: number) => {
    togglePinMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })
    });
  };

  const handleReact = (id: number) => {
    reactMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })
    });
  };

  const getNoteStyle = (style?: string) => {
    switch(style) {
      case 'letter': return 'bg-white shadow-md border-b-4 border-r-4 border-gray-100 font-serif';
      case 'floral': return 'bg-pink-50 border-pink-200 border bg-[url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23e8a0bf\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")] font-handwriting text-xl';
      default: return 'bg-yellow-100 shadow-md rotate-[-1deg] font-handwriting text-xl'; // sticky
    }
  };

  if (isLoading) return <div className="text-center py-20 text-primary">Loading notes...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-primary">Love Notes</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-md">
              <PenLine className="mr-2" size={18} /> Write Note
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary">Leave a Note</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="Just wanted to say..." 
                          className="min-h-[150px] bg-white/50 font-handwriting text-xl resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-2xl" disabled={createNoteMutation.isPending}>
                  {createNoteMutation.isPending ? "Sending..." : "Leave Note"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {notes.length > 0 ? (
          notes.map(note => (
            <Card key={note.id} className={`p-4 rounded-lg relative transition-transform hover:scale-105 ${getNoteStyle(note.style)}`}>
              <CardContent className="p-2 min-h-[120px] flex flex-col">
                <div className="absolute top-2 right-2 flex gap-2">
                  <button onClick={() => handleTogglePin(note.id)} className={`text-muted-foreground hover:text-primary transition-colors ${note.isPinned ? 'text-primary' : ''}`}>
                    <Pin size={16} className={note.isPinned ? 'fill-current' : ''} />
                  </button>
                </div>
                <div className="flex-1 mt-4 whitespace-pre-wrap">{note.content}</div>
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-black/5">
                  <span className="text-xs opacity-60 font-sans">{format(new Date(note.createdAt!), "MMM d")}</span>
                  <button onClick={() => handleReact(note.id)} className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors">
                    <Heart size={14} className={note.heartCount ? 'fill-primary text-primary' : ''} />
                    <span className="text-xs font-sans font-medium">{note.heartCount || 0}</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            <p>No notes yet.</p>
            <p>Leave a sweet message to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}
