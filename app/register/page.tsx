import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a DriveAnywhere.ai account or continue as a guest.",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
        Account
      </p>
      <h1 className="mt-3 font-display text-4xl text-white">Create account</h1>
      <p className="mt-3 mb-8 text-sm text-mist">
        Accounts are local for now. Your password never leaves this browser in
        mock mode.
      </p>
      <RegisterForm />
    </div>
  );
}
