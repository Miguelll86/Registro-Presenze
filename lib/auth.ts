import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "timbratura-secret-key-change-in-production"
);

export type SessionPayload = {
  dipendenteId: string;
  email: string;
  exp: number;
};

export async function createSession(dipendenteId: string, email: string) {
  const token = await new SignJWT({ dipendenteId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);

  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function logout() {
  (await cookies()).delete("session");
}

export type DipendenteInfo = {
  id: string;
  email: string | null;
  nome: string;
  cognome: string;
  role: string;
};

export async function getCurrentDipendente(): Promise<DipendenteInfo | null> {
  const session = await getSession();
  if (!session) return null;
  const d = await prisma.dipendente.findUnique({
    where: { id: session.dipendenteId },
    select: { id: true, email: true, nome: true, cognome: true, role: true },
  });
  return d;
}

export async function requireAdmin(): Promise<DipendenteInfo | null> {
  const d = await getCurrentDipendente();
  if (!d || d.role !== "ADMIN") return null;
  return d;
}
