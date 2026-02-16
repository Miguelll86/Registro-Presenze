import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Admin: elenco entrate/uscite di tutti i dipendenti (o filtrato). */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dipendenteId = searchParams.get("dipendenteId");
  const da = searchParams.get("da");
  const a = searchParams.get("a");

  const where: { dipendenteId?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
  if (dipendenteId) where.dipendenteId = dipendenteId;
  if (da || a) {
    where.createdAt = {};
    if (da) where.createdAt.gte = new Date(da + "T00:00:00");
    if (a) where.createdAt.lte = new Date(a + "T23:59:59.999");
  }

  const timbrature = await prisma.timbratura.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      dipendente: { select: { id: true, nome: true, cognome: true } },
    },
  });

  return NextResponse.json(timbrature);
}
