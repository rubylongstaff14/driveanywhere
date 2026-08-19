"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const result = login(values);
    if (!result.ok) {
      setFormError(result.message);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof LoginInput, { message });
        }
      }
      return;
    }
    router.push("/profile");
  }

  function onGuest() {
    const result = continueAsGuest();
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    router.push("/profile");
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {formError ? (
          <p className="text-sm text-signal" role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="border-line w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.16em]">
          <span className="bg-ink-950 text-fog px-3">or</span>
        </div>
      </div>

      <Button type="button" variant="secondary" className="w-full" onClick={onGuest}>
        Continue as guest
      </Button>

      <p className="text-sm text-mist">
        Need an account?{" "}
        <Link
          href="/register"
          className="text-accent-bright underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
