import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { CalendarHeart, Flower2, Heart, Home, StickyNote, Target } from "lucide-react";
import { ReactNode } from "react";
import { useGetMyBloomSpace, getGetMyBloomSpaceQueryKey } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: bloomSpace } = useGetMyBloomSpace({
    query: { enabled: !!user, queryKey: getGetMyBloomSpaceQueryKey() }
  });

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/calendar", label: "Calendar", icon: CalendarHeart },
    { href: "/memories", label: "Memories", icon: Heart },
    { href: "/notes", label: "Love Notes", icon: StickyNote },
    { href: "/tasks", label: "Tasks", icon: Flower2 },
    { href: "/focus", label: "Focus", icon: Target },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-white/50 backdrop-blur-sm shadow-sm z-10 sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="font-serif text-2xl text-primary font-bold tracking-tight">Bloom Together</h1>
          {bloomSpace && (
            <p className="text-sm text-muted-foreground mt-1">
              {bloomSpace.name}
            </p>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                    isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/20" 
                      : "text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <item.icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <Link href="/settings">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl hover:bg-secondary/50 cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-serif">
                {user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground">Settings</p>
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full pb-20 md:pb-0 overflow-x-hidden relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Subtle floating petals could go here, or handled globally */}
        </div>
        <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border z-50 px-2 pb-safe pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className="flex flex-col items-center p-2 cursor-pointer relative">
                  {isActive && (
                    <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full" />
                  )}
                  <div className={`p-1.5 rounded-full transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                    <item.icon size={22} />
                  </div>
                  <span className={`text-[10px] mt-1 ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
