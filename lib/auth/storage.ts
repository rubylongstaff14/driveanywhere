import type { AuthSession, UserProfile } from "@/types/auth";

const SESSION_KEY = "driveanywhere.auth.session";
const USERS_KEY = "driveanywhere.auth.users";

export interface StoredMockUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  password: string;
  avatarUrl: string | null;
  countryCode: string | null;
  createdAt: string;
  totalAttempts: number;
  completedRoutes: number;
  favouriteRouteId: string | null;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readSession(): AuthSession | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  if (!canUseStorage()) {
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (!canUseStorage()) {
    return;
  }
  localStorage.removeItem(SESSION_KEY);
}

export function readMockUsers(): StoredMockUser[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as StoredMockUser[];
  } catch {
    return [];
  }
}

export function writeMockUsers(users: StoredMockUser[]): void {
  if (!canUseStorage()) {
    return;
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function toProfile(
  user: StoredMockUser,
  mode: "guest" | "registered" = "registered",
): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    countryCode: user.countryCode,
    createdAt: user.createdAt,
    totalAttempts: user.totalAttempts,
    completedRoutes: user.completedRoutes,
    favouriteRouteId: user.favouriteRouteId,
    mode,
  };
}
