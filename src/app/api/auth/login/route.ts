import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  const isDev = process.env.NODE_ENV === "development";
  try {
    const body = await request.json().catch(() => ({}));
    const nome = body?.nome ?? "";
    const cognome = body?.cognome ?? "";
    const password = body?.password ?? "";
    const n = norm(String(nome));
    const c = norm(String(cognome));
    if (!n || !c || !password) {
      return NextResponse.json(
        isDev
          ? { error: "Nome, cognome e password richiesti", debug: { ricevuto: body } }
          : { error: "Nome, cognome e password richiesti" },
        { status: 400 }
      );
    }

    const tutti = await prisma.dipendente.findMany();
    const dipendente = tutti.find(
      (d) =>
        d.nome.trim().toLowerCase() === n.toLowerCase() &&
        d.cognome.trim().toLowerCase() === c.toLowerCase()
    ) ?? null;

    if (!dipendente) {
      return NextResponse.json(
        isDev
          ? {
              error: "Credenziali non valide",
              debug: { motivo: "Nessun utente con questo nome/cognome", totaleUtenti: tutti.length },
            }
          : { error: "Credenziali non valide" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(String(password), dipendente.password);
    if (!ok) {
      return NextResponse.json(
        isDev
          ? { error: "Credenziali non valide", debug: { motivo: "Password errata" } }
          : { error: "Credenziali non valide" },
        { status: 401 }
      );
    }

    await createSession(dipendente.id, dipendente.email ?? "");
    return NextResponse.json({
      ok: true,
      dipendente: {
        id: dipendente.id,
        nome: dipendente.nome,
        cognome: dipendente.cognome,
      },
    });
  } catch (e) {
    console.error(e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "Errore durante il login";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
