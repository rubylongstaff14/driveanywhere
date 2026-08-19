export type AuthMode = "guest" | "registered";

export interface UserProfile {
  id: string;
  email: string | null;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  createdAt: string;
  totalAttempts: number;
  completedRoutes: number;
  favouriteRouteId: string | null;
  mode: AuthMode;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  createdAt: string;
}

export interface AuthResult {
  ok: true;
  session: AuthSession;
}

export interface AuthError {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type AuthResponse = AuthResult | AuthError;
