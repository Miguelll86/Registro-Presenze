import { NextResponse } from "next/server";
import { getCurrentDipendente } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { it } from "date-fns/locale";

function getMonthBounds(anno: number, mese: number) {
  const primo = new Date(anno, mese - 1, 1);
  const ultimo = new Date(anno, mese, 0, 23, 59, 59, 999);
  return { da: primo, a: ultimo };
}

export async function GET(request: Request) {
  const dipendente = await getCurrentDipendente();
  if (!dipendente) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const now = new Date();
  const { searchParams } = new URL(request.url);
  const annoParam = searchParams.get("anno");
  const meseParam = searchParams.get("mese");
  const anno = annoParam ? parseInt(annoParam, 10) : now.getFullYear();
  const mese = meseParam ? Math.max(1, Math.min(12, parseInt(meseParam, 10))) : now.getMonth() + 1;
  const { da, a } = getMonthBounds(anno, mese);

  const timbrature = await prisma.timbratura.findMany({
    where: {
      dipendenteId: dipendente.id,
      createdAt: { gte: da, lte: a },
    },
    orderBy: { createdAt: "asc" },
  });

  let lastEntrata: Date | null = null;
  let totaleOre = 0;

  const rows = timbrature.map((t) => {
    const data = t.createdAt;
    let oreLavorate: string | number = "";
    let dataEntrata = "";
    let oraEntrata = "";
    if (t.tipo === "ENTRATA") {
      lastEntrata = data;
      dataEntrata = format(data, "dd/MM/yyyy", { locale: it });
      oraEntrata = format(data, "HH:mm:ss", { locale: it });
    } else if (t.tipo === "USCITA" && lastEntrata) {
      dataEntrata = format(lastEntrata, "dd/MM/yyyy", { locale: it });
      oraEntrata = format(lastEntrata, "HH:mm:ss", { locale: it });
      const ore = (data.getTime() - lastEntrata.getTime()) / (1000 * 60 * 60);
      totaleOre += ore;
      oreLavorate = Math.round(ore * 100) / 100;
      lastEntrata = null;
    }
    return {
      "Data entrata": dataEntrata,
      "Ora entrata": oraEntrata,
      Data: format(data, "dd/MM/yyyy", { locale: it }),
      Ora: format(data, "HH:mm:ss", { locale: it }),
      Tipo: t.tipo,
      "Ore lavorate": oreLavorate,
      Latitudine: t.latitudine,
      Longitudine: t.longitudine,
      Indirizzo: t.indirizzo || "",
      Città: t.citta || "",
    };
  });

  if (totaleOre > 0) {
    rows.push({
      "Data entrata": "",
      "Ora entrata": "",
      Data: "",
      Ora: "",
      Tipo: "TOTALE",
      "Ore lavorate": Math.round(totaleOre * 100) / 100,
      Latitudine: "",
      Longitudine: "",
      Indirizzo: "",
      Città: "",
    } as Record<string, string | number>);
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Presenze");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const meseLabel = format(da, "yyyy-MM", { locale: it });
  const nomeFile = `timbrature_${dipendente.cognome}_${meseLabel}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeFile}"`,
    },
  });
}
