"use client";

import { create } from "zustand";
import {
  getSession,
  login,
  loginAsGuest,
  logout,
  register,
  updateProfile,
} from "@/lib/auth/auth-service";
import type {
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
} from "@/lib/validation/auth";
import type { AuthSession, UserProfile } from "@/types/auth";

interface AuthState {
  session: AuthSession | null;
  user: UserProfile | null;
  hydrated: boolean;
  hydrate: () => void;
  register: (input: RegisterInput) => { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };
  login: (input: LoginInput) => { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };
  continueAsGuest: () => { ok: true } | { ok: false; message: string };
  logout: () => void;
  updateProfile: (
    input: ProfileUpdateInput,
  ) => { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    const session = getSession();
    set({
      session,
      user: session?.user ?? null,
      hydrated: true,
    });
  },
  register: (input) => {
    const result = register(input);
    if (!result.ok) {
      return result;
    }
    set({ session: result.session, user: result.session.user, hydrated: true });
    return { ok: true };
  },
  login: (input) => {
    const result = login(input);
    if (!result.ok) {
      return result;
    }
    set({ session: result.session, user: result.session.user, hydrated: true });
    return { ok: true };
  },
  continueAsGuest: () => {
    const result = loginAsGuest();
    if (!result.ok) {
      return result;
    }
    set({ session: result.session, user: result.session.user, hydrated: true });
    return { ok: true };
  },
  logout: () => {
    logout();
    set({ session: null, user: null, hydrated: true });
  },
  updateProfile: (input) => {
    const result = updateProfile(input);
    if (!result.ok) {
      return result;
    }
    set({ session: result.session, user: result.session.user, hydrated: true });
    return { ok: true };
  },
}));
