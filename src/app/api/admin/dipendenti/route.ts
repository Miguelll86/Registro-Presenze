import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const dipendenti = await prisma.dipendente.findMany({
    orderBy: { cognome: "asc" },
    select: {
      id: true,
      nome: true,
      cognome: true,
      role: true,
      createdAt: true,
      _count: { select: { timbrature: true } },
    },
  });
  return NextResponse.json(dipendenti);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { password, nome, cognome, role } = body;
    if (!password?.trim() || !nome?.trim() || !cognome?.trim()) {
      return NextResponse.json(
        { error: "Password, nome e cognome obbligatori" },
        { status: 400 }
      );
    }
    const n = nome.trim().replace(/\s+/g, " ");
    const c = cognome.trim().replace(/\s+/g, " ");
    const existing = await prisma.dipendente.findUnique({
      where: { nome_cognome: { nome: n, cognome: c } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Esiste già un dipendente con questo nome e cognome" },
        { status: 400 }
      );
    }
    const hashed = await bcrypt.hash(password.trim(), 10);
    const dipendente = await prisma.dipendente.create({
      data: {
        password: hashed,
        nome: n,
        cognome: c,
        role: role === "ADMIN" ? "ADMIN" : "DIPENDENTE",
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json(dipendente);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore nella creazione del dipendente" },
      { status: 500 }
    );
  }
}
