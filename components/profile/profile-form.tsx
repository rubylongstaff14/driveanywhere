"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";

export function ProfileForm() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: "",
      displayName: "",
      countryCode: "",
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    reset({
      username: user.username,
      displayName: user.displayName,
      countryCode: user.countryCode ?? "",
    });
  }, [reset, user]);

  async function onSubmit(values: ProfileUpdateInput) {
    setFormError(null);
    setStatus(null);
    const result = updateProfile(values);
    if (!result.ok) {
      setFormError(result.message);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof ProfileUpdateInput, { message });
        }
      }
      return;
    }
    setStatus("Profile updated.");
  }

  if (!user) {
    return null;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextInput
        label="Username"
        error={errors.username?.message}
        {...register("username")}
      />
      <TextInput
        label="Display name"
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <TextInput
        label="Country code"
        placeholder="GB"
        error={errors.countryCode?.message}
        {...register("countryCode")}
      />

      {formError ? (
        <p className="text-sm text-signal" role="alert">
          {formError}
        </p>
      ) : null}
      {status ? (
        <p className="text-sm text-emerald-300" role="status">
          {status}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
