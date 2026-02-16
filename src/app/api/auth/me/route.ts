import { NextResponse } from "next/server";
import { getCurrentDipendente } from "@/lib/auth";

export async function GET() {
  const dipendente = await getCurrentDipendente();
  if (!dipendente) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  return NextResponse.json(dipendente);
}
