import type {
  AuthResponse,
  AuthSession,
  UserProfile,
} from "@/types/auth";
import type {
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
} from "@/lib/validation/auth";
import {
  loginSchema,
  profileUpdateSchema,
  registerSchema,
} from "@/lib/validation/auth";
import {
  clearSession,
  readMockUsers,
  readSession,
  toProfile,
  writeMockUsers,
  writeSession,
  type StoredMockUser,
} from "@/lib/auth/storage";

function createId(): string {
  return crypto.randomUUID();
}

function createToken(): string {
  return `mock_${crypto.randomUUID().replace(/-/g, "")}`;
}

function fieldErrorsFromZod(
  error: { issues: { path: PropertyKey[]; message: string }[] },
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function makeSession(user: UserProfile): AuthSession {
  return {
    user,
    accessToken: createToken(),
    createdAt: new Date().toISOString(),
  };
}

export function getMockSession(): AuthSession | null {
  return readSession();
}

export function registerMockUser(input: RegisterInput): AuthResponse {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const users = readMockUsers();
  const email = parsed.data.email.toLowerCase();
  const username = parsed.data.username.toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === email)) {
    return {
      ok: false,
      message: "An account with that email already exists.",
      fieldErrors: { email: "Email is already registered" },
    };
  }

  if (users.some((user) => user.username.toLowerCase() === username)) {
    return {
      ok: false,
      message: "That username is taken.",
      fieldErrors: { username: "Username is already taken" },
    };
  }

  const stored: StoredMockUser = {
    id: createId(),
    email,
    username,
    displayName: parsed.data.displayName,
    password: parsed.data.password,
    avatarUrl: null,
    countryCode: null,
    createdAt: new Date().toISOString(),
    totalAttempts: 0,
    completedRoutes: 0,
    favouriteRouteId: null,
  };

  writeMockUsers([...users, stored]);
  const session = makeSession(toProfile(stored, "registered"));
  writeSession(session);
  return { ok: true, session };
}

export function loginMockUser(input: LoginInput): AuthResponse {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const users = readMockUsers();
  const email = parsed.data.email.toLowerCase();
  const match = users.find((user) => user.email.toLowerCase() === email);

  if (!match || match.password !== parsed.data.password) {
    return {
      ok: false,
      message: "Incorrect email or password.",
      fieldErrors: { email: "Incorrect email or password" },
    };
  }

  const session = makeSession(toProfile(match, "registered"));
  writeSession(session);
  return { ok: true, session };
}

export function continueAsGuest(): AuthResponse {
  const guestNumber = Math.floor(1000 + Math.random() * 9000);
  const profile: UserProfile = {
    id: createId(),
    email: null,
    username: `guest_${guestNumber}`,
    displayName: `Guest ${guestNumber}`,
    avatarUrl: null,
    countryCode: null,
    createdAt: new Date().toISOString(),
    totalAttempts: 0,
    completedRoutes: 0,
    favouriteRouteId: null,
    mode: "guest",
  };

  const session = makeSession(profile);
  writeSession(session);
  return { ok: true, session };
}

export function logoutMockUser(): void {
  clearSession();
}

export function updateMockProfile(
  input: ProfileUpdateInput,
): AuthResponse {
  const session = readSession();
  if (!session) {
    return { ok: false, message: "You need to be signed in." };
  }

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  if (session.user.mode === "guest") {
    const updated: AuthSession = {
      ...session,
      user: {
        ...session.user,
        username: parsed.data.username.toLowerCase(),
        displayName: parsed.data.displayName,
        countryCode: parsed.data.countryCode
          ? parsed.data.countryCode
          : null,
      },
    };
    writeSession(updated);
    return { ok: true, session: updated };
  }

  const users = readMockUsers();
  const index = users.findIndex((user) => user.id === session.user.id);
  if (index < 0) {
    return { ok: false, message: "Account not found in mock storage." };
  }

  const username = parsed.data.username.toLowerCase();
  if (
    users.some(
      (user, userIndex) =>
        userIndex !== index && user.username.toLowerCase() === username,
    )
  ) {
    return {
      ok: false,
      message: "That username is taken.",
      fieldErrors: { username: "Username is already taken" },
    };
  }

  const nextUser: StoredMockUser = {
    ...users[index],
    username,
    displayName: parsed.data.displayName,
    countryCode: parsed.data.countryCode
      ? parsed.data.countryCode
      : null,
  };

  const nextUsers = [...users];
  nextUsers[index] = nextUser;
  writeMockUsers(nextUsers);

  const nextSession: AuthSession = {
    ...session,
    user: toProfile(nextUser, "registered"),
  };
  writeSession(nextSession);
  return { ok: true, session: nextSession };
}
