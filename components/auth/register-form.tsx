"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      displayName: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    const result = registerUser(values);
    if (!result.ok) {
      setFormError(result.message);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof RegisterInput, { message });
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
          label="Username"
          autoComplete="username"
          error={errors.username?.message}
          {...register("username")}
        />
        <TextInput
          label="Display name"
          autoComplete="nickname"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <TextInput
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {formError ? (
          <p className="text-sm text-signal" role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <Button type="button" variant="secondary" className="w-full" onClick={onGuest}>
        Continue as guest
      </Button>

      <p className="text-sm text-mist">
        Already registered?{" "}
        <Link
          href="/login"
          className="text-accent-bright underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
