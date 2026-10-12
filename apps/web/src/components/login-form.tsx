import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type LoginFormProps = {
  mode: "login" | "signup";
};

type SocialProvider = "google" | "github";

const DASHBOARD = "/dashboard/overview";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

export function LoginForm({ mode }: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? DASHBOARD;
  const isSignup = mode === "signup";
  const isReauth =
    !isSignup && new URLSearchParams(location.search).get("reauth") === "1";
  const [pendingAction, setPendingAction] = useState<
    "email" | SocialProvider | null
  >(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

    setPendingAction("email");
    try {
      const { error } = isSignup
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });

      if (error) {
        toast.error(error.message ?? "Something went wrong");
        return;
      }
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function onSocialSignIn(provider: SocialProvider) {
    setPendingAction(provider);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}${from}`,
      });

      if (error) {
        toast.error(error.message ?? `${provider} sign-in failed.`);
        setPendingAction(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `${provider} sign-in failed. Please try again.`,
      );
      setPendingAction(null);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-12">
      <section className="w-full max-w-sm">
        <div className="space-y-7">
          <header className="space-y-3 text-center">
            <Logo className="mx-auto h-9 w-auto" />
            <h1 className="text-xl font-semibold tracking-tight">
              {isSignup
                ? "Create your account"
                : isReauth
                  ? "Sign in again"
                  : "Login to Synodos"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <Link
                to={isSignup ? "/login" : "/signup"}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                {isSignup ? "Sign in" : "Sign up"}
              </Link>
            </p>
          </header>

          <div className="space-y-5">
            <form onSubmit={onSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Jane Smith"
                    disabled={pendingAction !== null}
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
                  disabled={pendingAction !== null}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                  disabled={pendingAction !== null}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={pendingAction !== null}
              >
                {pendingAction === "email" && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="relative flex items-center">
              <span className="w-full border-t" />
              <span className="absolute left-1/2 -translate-x-1/2 bg-background px-3 text-sm text-muted-foreground">
                Or
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-background"
                onClick={() => void onSocialSignIn("google")}
                disabled={pendingAction !== null}
              >
                {pendingAction === "google" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-background"
                onClick={() => void onSocialSignIn("github")}
                disabled={pendingAction !== null}
              >
                {pendingAction === "github" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.3 9.39 7.87 10.91.58.1.79-.25.79-.56v-2.02c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
                    />
                  </svg>
                )}
                GitHub
              </Button>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
