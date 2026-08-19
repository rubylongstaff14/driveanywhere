import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only use letters, numbers, and underscores",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Display name must be at least 2 characters")
  .max(40, "Display name must be at most 40 characters");

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    displayName: displayNameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  countryCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => value === "" || /^[A-Z]{2}$/.test(value),
      "Use a 2-letter country code",
    )
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
