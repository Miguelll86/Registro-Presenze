import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const { password, nome, cognome, role } = body;
    const existing = await prisma.dipendente.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Dipendente non trovato" }, { status: 404 });
    }
    const data: { password?: string; nome?: string; cognome?: string; role?: string } = {};
    if (nome !== undefined) data.nome = nome.trim().replace(/\s+/g, " ");
    if (cognome !== undefined) data.cognome = cognome.trim().replace(/\s+/g, " ");
    if (role === "ADMIN" || role === "DIPENDENTE") data.role = role;
    if (password && password.trim()) data.password = await bcrypt.hash(password.trim(), 10);
    const newNome = data.nome ?? existing.nome;
    const newCognome = data.cognome ?? existing.cognome;
    if (newNome !== existing.nome || newCognome !== existing.cognome) {
      const conflict = await prisma.dipendente.findUnique({
        where: { nome_cognome: { nome: newNome, cognome: newCognome } },
      });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: "Esiste già un dipendente con questo nome e cognome" },
          { status: 400 }
        );
      }
    }
    const dipendente = await prisma.dipendente.update({
      where: { id },
      data,
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
      { error: "Errore nell'aggiornamento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json(
      { error: "Non puoi eliminare il tuo account admin" },
      { status: 400 }
    );
  }
  const existing = await prisma.dipendente.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dipendente non trovato" }, { status: 404 });
  }
  await prisma.dipendente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
