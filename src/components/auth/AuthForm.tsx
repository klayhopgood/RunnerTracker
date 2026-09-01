"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "reset";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } else if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }
    } else {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("Password reset link sent — check your email.");
      }
    }

    setLoading(false);
  }

  const title =
    mode === "login"
      ? "Log in"
      : mode === "signup"
        ? "Create account"
        : "Reset password";

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {mode === "reset"
            ? "We will email you a reset link."
            : "Track live. Share your run."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              autoComplete="name"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            autoComplete="email"
          />
        </label>

        {mode !== "reset" && (
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
          </label>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Please wait…" : title}
        </button>
      </form>

      <div className="space-y-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {mode === "login" && (
          <>
            <p>
              No account?{" "}
              <Link href="/signup" className="text-emerald-600 hover:underline dark:text-emerald-400">
                Sign up
              </Link>
            </p>
            <p>
              <Link
                href="/reset-password"
                className="text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Forgot password?
              </Link>
            </p>
          </>
        )}
        {mode === "signup" && (
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-600 hover:underline dark:text-emerald-400">
              Log in
            </Link>
          </p>
        )}
        {mode === "reset" && (
          <p>
            <Link href="/login" className="text-emerald-600 hover:underline dark:text-emerald-400">
              Back to login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
