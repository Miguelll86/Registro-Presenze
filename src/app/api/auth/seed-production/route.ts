import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Esegue il seed sul database usato da Vercel (stesso DATABASE_URL).
 * Chiama: GET /api/auth/seed-production?secret=IL_TUO_SEED_SECRET
 * Imposta in Vercel la variabile SEED_SECRET (es. una stringa casuale).
 * Dopo aver creato l'admin, elimina questa route o rimuovi SEED_SECRET.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const expected = process.env.SEED_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const hashed = await bcrypt.hash("Cicci2023", 10);
    await prisma.dipendente.upsert({
      where: { nome_cognome: { nome: "Anna", cognome: "Lorusso" } },
      update: { role: "ADMIN", password: hashed },
      create: {
        password: hashed,
        nome: "Anna",
        cognome: "Lorusso",
        role: "ADMIN",
      },
    });
    return NextResponse.json({
      ok: true,
      messaggio: "Admin creato. Login: Anna, Lorusso, Cicci2023. Rimuovi la variabile SEED_SECRET da Vercel.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore seed" },
      { status: 500 }
    );
  }
}
