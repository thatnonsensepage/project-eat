import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE = "eat-admin";

function tokenFor(pw: string): string {
  return createHash("sha256").update(pw).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  return c === tokenFor(pw);
}

export async function grantAdmin(password: string): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || password !== pw) return false;
  (await cookies()).set(COOKIE, tokenFor(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/admin",
  });
  return true;
}

export async function revokeAdmin(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}
