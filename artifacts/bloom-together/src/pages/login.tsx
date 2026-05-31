import { useState } from "react";
import { z } from "zod";
import { useLogin, useRegister, getMyBloomSpace } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FieldErrors = Record<string, string>;

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regErrors, setRegErrors] = useState<FieldErrors>({});

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setLoginErrors(errs);
      return;
    }
    setLoginErrors({});
    loginMutation.mutate(
      { data: result.data },
      {
        onSuccess: async (data) => {
          login(data.token, data.user);
          try {
            await getMyBloomSpace();
            setLocation("/");
          } catch {
            setLocation("/onboarding");
          }
        },
        onError: (err: any) => {
          toast({
            title: "Login failed",
            description: err?.data?.error ?? "Invalid email or password",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const result = registerSchema.safeParse({ name: regName, email: regEmail, password: regPassword });
    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setRegErrors(errs);
      return;
    }
    setRegErrors({});
    registerMutation.mutate(
      { data: result.data },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          setLocation("/onboarding");
        },
        onError: (err: any) => {
          toast({
            title: "Registration failed",
            description: err?.data?.error ?? "Could not create account. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const inputCls = "w-full rounded-xl border border-pink-200 bg-white/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";
  const labelCls = "block text-sm font-medium text-foreground/80 mb-1";
  const errorCls = "text-xs text-destructive mt-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Floating hearts */}
        <div className="absolute top-[10%] left-[15%] text-pink-300/30 animate-float-slow">
          <Heart size={32} className="fill-current" />
        </div>
        <div className="absolute top-[60%] left-[8%] text-pink-200/25 animate-float-slower">
          <Heart size={24} className="fill-current" />
        </div>
        <div className="absolute top-[30%] right-[12%] text-rose-300/30 animate-float-slow delay-1000">
          <Heart size={28} className="fill-current" />
        </div>
        <div className="absolute bottom-[25%] right-[20%] text-pink-300/25 animate-float-slower delay-2000">
          <Heart size={20} className="fill-current" />
        </div>
        
        {/* Floating flowers */}
        <div className="absolute top-[20%] right-[25%] text-pink-200/20 animate-float-slower delay-500 text-3xl">
          🌸
        </div>
        <div className="absolute bottom-[40%] left-[25%] text-rose-200/20 animate-float-slow delay-1500 text-2xl">
          🌹
        </div>
        <div className="absolute top-[70%] right-[15%] text-pink-300/20 animate-float-slower text-2xl">
          🌷
        </div>
        <div className="absolute bottom-[15%] left-[35%] text-rose-200/25 animate-float-slow delay-2500 text-xl">
          🌺
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white/60 backdrop-blur-md border border-white/80 shadow-2xl shadow-pink-100/40 p-8">
        <div className="text-center mb-6">
          {/* Pink heart logo */}
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <Heart size={48} className="text-primary fill-primary" />
            </div>
          </div>
          <h1 className="font-serif text-4xl text-primary font-bold tracking-tight mb-1">
            Bloom Together
          </h1>
          <p className="text-muted-foreground">Your private digital sanctuary for two</p>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className={inputCls}
                placeholder="hello@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
              />
              {loginErrors.email && <p className={errorCls}>{loginErrors.email}</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className={inputCls}
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
              {loginErrors.password && <p className={errorCls}>{loginErrors.password}</p>}
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 mt-2"
            >
              {loginMutation.isPending ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="reg-name">Your name</label>
              <input
                id="reg-name"
                type="text"
                className={inputCls}
                placeholder="e.g. Emma"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                autoComplete="name"
              />
              {regErrors.name && <p className={errorCls}>{regErrors.name}</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                className={inputCls}
                placeholder="hello@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
              />
              {regErrors.email && <p className={errorCls}>{regErrors.email}</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className={inputCls}
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
              />
              {regErrors.password && <p className={errorCls}>{regErrors.password}</p>}
            </div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 mt-2"
            >
              {registerMutation.isPending ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {isLogin ? "Don't have a space yet? Register" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
