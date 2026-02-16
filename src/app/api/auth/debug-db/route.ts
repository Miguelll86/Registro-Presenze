import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Route temporanea per capire se il DB su Vercel vede gli utenti. Elimina dopo il debug. */
export async function GET() {
  try {
    const count = await prisma.dipendente.count();
    const first = await prisma.dipendente.findFirst({
      select: { nome: true, cognome: true, role: true },
    });
    return NextResponse.json({
      ok: true,
      utentiNelDb: count,
      primoUtente: first ? `${first.nome} ${first.cognome} (${first.role})` : null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, errore: e instanceof Error ? e.message : "Errore DB" },
      { status: 500 }
    );
  }
}
