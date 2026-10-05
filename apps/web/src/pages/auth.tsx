import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignup ? "Create your account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {isSignup ? "Start collaborating in seconds." : "Sign in to Synodos."}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <Button type="button" variant="outline" onClick={onGoogle}>
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="grid gap-4">
            {isSignup && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required autoComplete="name" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isSignup ? "Sign up" : "Sign in"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          {isSignup ? (
            <>Already have an account?&nbsp;<Link to="/login" className="underline">Sign in</Link></>
          ) : (
            <>New here?&nbsp;<Link to="/signup" className="underline">Create an account</Link></>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export const LoginPage = () => <AuthForm mode="login" />;
export const SignupPage = () => <AuthForm mode="signup" />;