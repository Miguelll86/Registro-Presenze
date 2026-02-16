import { NextResponse } from "next/server";
import { getCurrentDipendente } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Reverse geocoding: da lat/lng ottiene indirizzo e città (Nominatim OpenStreetMap) */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ indirizzo: string | null; citta: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RegistroPresenze/1.0" },
    });
    if (!res.ok) return { indirizzo: null, citta: null };
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
      };
    };
    const indirizzo = data.display_name ?? null;
    const addr = data.address ?? {};
    const citta =
      addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? null;
    return { indirizzo, citta };
  } catch {
    return { indirizzo: null, citta: null };
  }
}

export async function GET(request: Request) {
  const dipendente = await getCurrentDipendente();
  if (!dipendente) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const da = searchParams.get("da"); // YYYY-MM-DD
  const a = searchParams.get("a");   // YYYY-MM-DD

  const where: { dipendenteId: string; createdAt?: { gte?: Date; lte?: Date } } = {
    dipendenteId: dipendente.id,
  };

  if (da || a) {
    where.createdAt = {};
    if (da) where.createdAt.gte = new Date(da + "T00:00:00");
    if (a) where.createdAt.lte = new Date(a + "T23:59:59.999");
  }

  const timbrature = await prisma.timbratura.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(timbrature);
}

export async function POST(request: Request) {
  const dipendente = await getCurrentDipendente();
  if (!dipendente) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tipo, latitudine, longitudine } = body;

    if (!tipo || tipo !== "ENTRATA" && tipo !== "USCITA") {
      return NextResponse.json(
        { error: "tipo deve essere ENTRATA o USCITA" },
        { status: 400 }
      );
    }

    if (typeof latitudine !== "number" || typeof longitudine !== "number") {
      return NextResponse.json(
        { error: "Coordinate GPS (latitudine, longitudine) richieste" },
        { status: 400 }
      );
    }

    const { indirizzo, citta } = await reverseGeocode(latitudine, longitudine);

    const timbratura = await prisma.timbratura.create({
      data: {
        tipo,
        latitudine,
        longitudine,
        indirizzo: indirizzo ?? null,
        citta: citta ?? null,
        dipendenteId: dipendente.id,
      },
    });

    return NextResponse.json(timbratura);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore nel salvataggio della presenza" },
      { status: 500 }
    );
  }
}
