import { useState, type FormEvent } from "react";
import { Loader2, Command, Users, Zap, Shield } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const DASHBOARD = "/dashboard/overview";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? DASHBOARD;
  const isSignup = mode === "signup";
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

    setLoading(true);
    const { error } = isSignup
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Something went wrong");
      return;
    }
    navigate(from, { replace: true });
  }

  async function onGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${from}`,
    });
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary/90 to-primary p-10 text-primary-foreground md:flex lg:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 flex items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <Command className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Synodos</span>
        </div>
        
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
            Where teams do their best work together.
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            Experience the next generation of collaborative document editing with real-time sync and powerful organizational tools.
          </p>
          
          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/10">
                <Zap className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">Lightning Fast</h3>
                <p className="text-sm text-primary-foreground/70">Real-time collaboration with zero lag.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/10">
                <Users className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">Built for Teams</h3>
                <p className="text-sm text-primary-foreground/70">Granular permissions and shared workspaces.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/10">
                <Shield className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">Enterprise Security</h3>
                <p className="text-sm text-primary-foreground/70">Your data is encrypted and secure at all times.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Synodos Inc. All rights reserved.
        </div>
      </div>
      
      <div className="flex w-full items-center justify-center p-6 md:w-1/2 lg:p-10 bg-background">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-semibold tracking-tight">
              {isSignup ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignup ? "Enter your details to get started." : "Enter your credentials to sign in to your account."}
            </p>
          </div>

          <div className="space-y-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    required 
                    autoComplete="name" 
                    placeholder="John Doe"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  autoComplete="email" 
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isSignup ? "Sign up" : "Sign in"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={onGoogle}
              className="w-full bg-background"
            >
              <GoogleIcon />
              Google
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <Link 
              to={isSignup ? "/login" : "/signup"} 
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export const LoginPage = () => <AuthForm mode="login" />;
export const SignupPage = () => <AuthForm mode="signup" />;