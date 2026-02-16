import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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
    orderBy: { createdAt: "asc" },
    include: {
      dipendente: { select: { nome: true, cognome: true } },
    },
  });

  const lastEntrataByDip: Record<string, Date> = {};
  const rows = timbrature.map((t) => {
    const nomeDip = `${t.dipendente.cognome} ${t.dipendente.nome}`;
    let oreLavorate: string | number = "";
    let dataEntrata = "";
    let oraEntrata = "";
    if (t.tipo === "ENTRATA") {
      lastEntrataByDip[t.dipendenteId] = t.createdAt;
      dataEntrata = format(t.createdAt, "dd/MM/yyyy", { locale: it });
      oraEntrata = format(t.createdAt, "HH:mm:ss", { locale: it });
    } else if (t.tipo === "USCITA" && lastEntrataByDip[t.dipendenteId]) {
      const lastE = lastEntrataByDip[t.dipendenteId];
      dataEntrata = format(lastE, "dd/MM/yyyy", { locale: it });
      oraEntrata = format(lastE, "HH:mm:ss", { locale: it });
      const ore = (t.createdAt.getTime() - lastE.getTime()) / (1000 * 60 * 60);
      oreLavorate = Math.round(ore * 100) / 100;
      delete lastEntrataByDip[t.dipendenteId];
    }
    return {
      Dipendente: nomeDip,
      "Data entrata": dataEntrata,
      "Ora entrata": oraEntrata,
      Data: format(t.createdAt, "dd/MM/yyyy", { locale: it }),
      Ora: format(t.createdAt, "HH:mm:ss", { locale: it }),
      Tipo: t.tipo,
      "Ore lavorate": oreLavorate,
      Indirizzo: t.indirizzo || "",
      Città: t.citta || "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Presenze");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const nomeFile = `presenze_admin_${da || "inizio"}_${a || "oggi"}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeFile}"`,
    },
  });
}
