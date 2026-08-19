import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to DriveAnywhere.ai or continue as a guest.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
        Account
      </p>
      <h1 className="mt-3 font-display text-4xl text-white">Log in</h1>
      <p className="mt-3 mb-8 text-sm text-mist">
        Mock authentication stores your session in this browser. Supabase can be
        connected later without changing the UI.
      </p>
      <LoginForm />
    </div>
  );
}
