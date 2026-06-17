import { useEffect, useState } from "react";
import { apiFetch, TOKEN_KEY } from "./api/client";

export type FimUser = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  initials: string;
  verified?: boolean;
  premium?: boolean;
};

const USER_KEY = "fim.auth.user";

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fim-auth-change"));
  }
}

export function getCurrentUser(): FimUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as FimUser) : null;
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<FimUser> {
  const data = await apiFetch("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  emit();
  return data.user;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<FimUser> {
  const data = await apiFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone }),
  });

  // Save the unverified user details to local storage so the verify page has context
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  emit();
  return data.user;
}

export async function resendVerification(email: string): Promise<void> {
  await apiFetch("/api/auth/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmail(email: string, code: string): Promise<FimUser> {
  const user = await apiFetch<FimUser>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emit();
  return user;
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emit();
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch("/api/auth/request-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<FimUser> {
  const user = await apiFetch<FimUser>("/api/auth/reset", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emit();
  return user;
}

export function useAuth() {
  const [user, setUser] = useState<FimUser | null>(() => getCurrentUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);

    const h = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener("fim-auth-change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("fim-auth-change", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  return { user, ready };
}
