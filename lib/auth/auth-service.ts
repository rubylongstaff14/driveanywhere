import {
  continueAsGuest,
  getMockSession,
  loginMockUser,
  logoutMockUser,
  registerMockUser,
  updateMockProfile,
} from "@/lib/auth/mock-auth";
import { isSupabaseAuthReady } from "@/lib/auth/supabase-client";
import type {
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
} from "@/lib/validation/auth";
import type { AuthResponse, AuthSession } from "@/types/auth";

/**
 * Auth facade. Mock mode is active now; Supabase can replace this later
 * without changing UI call sites.
 */
export function getSession(): AuthSession | null {
  if (isSupabaseAuthReady()) {
    return null;
  }
  return getMockSession();
}

export function register(input: RegisterInput): AuthResponse {
  return registerMockUser(input);
}

export function login(input: LoginInput): AuthResponse {
  return loginMockUser(input);
}

export function loginAsGuest(): AuthResponse {
  return continueAsGuest();
}

export function logout(): void {
  logoutMockUser();
}

export function updateProfile(input: ProfileUpdateInput): AuthResponse {
  return updateMockProfile(input);
}
