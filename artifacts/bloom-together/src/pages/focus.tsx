import { useState, useEffect } from "react";
import { useCreateFocusSession, FocusSessionInputType } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Focus() {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const [sessionType, setSessionType] = useState<'work' | 'break'>('work');
  const { toast } = useToast();
  
  const createSessionMutation = useCreateFocusSession();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      if (sessionType === 'work') {
        toast({ title: "Focus session complete!", description: "Time for a break." });
        setSessionType('break');
        setTimeLeft(5 * 60);
        
        // Log the session
        createSessionMutation.mutate({
          data: { type: FocusSessionInputType.pomodoro, notes: "Completed 25m pomodoro" }
        });
      } else {
        toast({ title: "Break over!", description: "Ready to focus again?" });
        setSessionType('work');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionType, toast, createSessionMutation]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setSessionType('work');
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center animate-in fade-in duration-1000">
      {/* Ambient background animations when active */}
      {isActive && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-30">
           <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
           <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-sage/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
           <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-gold/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>
      )}

      <div className="text-center space-y-8 w-full max-w-md">
        <h1 className="text-3xl font-serif text-primary opacity-80">
          {sessionType === 'work' ? "Deep Focus" : "Rest & Recharge"}
        </h1>

        <Card className="glass-card border-none shadow-2xl relative overflow-hidden group">
          <div className={`absolute inset-0 opacity-10 transition-opacity duration-1000 ${isActive ? 'bg-primary' : 'bg-transparent'}`} />
          
          <CardContent className="p-12 relative z-10">
            <div className="text-7xl md:text-9xl font-serif font-light tracking-tight text-foreground/80 tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            
            <p className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-sm">
              {sessionType === 'work' ? 'Working together' : 'Taking a breather'}
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4">
          <Button 
            size="lg" 
            className={`rounded-full w-20 h-20 shadow-xl transition-transform hover:scale-105 ${isActive ? 'bg-white text-primary hover:bg-white/90' : ''}`}
            onClick={toggleTimer}
          >
            {isActive ? <Square size={32} /> : <Play size={32} className="ml-1" />}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full w-12 h-12 bg-white/50"
            onClick={resetTimer}
          >
            <Coffee size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
