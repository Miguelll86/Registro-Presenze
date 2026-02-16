"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Dipendente = { id: string; nome: string; cognome: string; role?: string };
type Timbratura = {
  id: string;
  tipo: string;
  latitudine: number;
  longitudine: number;
  indirizzo: string | null;
  citta: string | null;
  createdAt: string;
};

function getGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [dipendente, setDipendente] = useState<Dipendente | null>(null);
  const [timbrature, setTimbrature] = useState<Timbratura[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [actionLoading, setActionLoading] = useState<"ENTRATA" | "USCITA" | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [monthYear, setMonthYear] = useState(() => format(new Date(), "yyyy-MM"));

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      router.replace("/login");
      return null;
    }
    const data = await res.json();
    setDipendente(data);
    return data;
  }, [router]);

  const loadTimbrature = useCallback(async () => {
    if (!monthYear) return;
    const [anno, mese] = monthYear.split("-").map(Number);
    const primo = new Date(anno, mese - 1, 1);
    const ultimo = new Date(anno, mese, 0);
    const params = new URLSearchParams({
      da: format(primo, "yyyy-MM-dd"),
      a: format(ultimo, "yyyy-MM-dd"),
    });
    const res = await fetch("/api/timbrature?" + params.toString());
    if (res.ok) {
      const data = await res.json();
      setTimbrature(data);
    }
  }, [monthYear]);

  useEffect(() => {
    let ok = true;
    (async () => {
      const d = await loadMe();
      if (d) await loadTimbrature();
      if (ok) setLoading(false);
    })();
    return () => { ok = false; };
  }, [loadMe, loadTimbrature]);

  useEffect(() => {
    if (dipendente && !loading && monthYear) loadTimbrature();
  }, [dipendente, loading, monthYear, loadTimbrature]);

  async function handleTimbratura(tipo: "ENTRATA" | "USCITA") {
    setGpsStatus("loading");
    setActionLoading(tipo);
    try {
      const { lat, lng } = await getGps();
      setGpsStatus("ok");
      const res = await fetch("/api/timbrature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, latitudine: lat, longitudine: lng }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore salvataggio");
      }
      await loadTimbrature();
    } catch (e) {
      setGpsStatus("error");
      alert(e instanceof Error ? e.message : "Errore GPS o di rete. Abilita la posizione e riprova.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function handleExport() {
    if (!monthYear) return;
    setExportLoading(true);
    const [anno, mese] = monthYear.split("-");
    window.open(`/api/timbrature/export?anno=${anno}&mese=${mese}`, "_blank");
    setTimeout(() => setExportLoading(false), 1500);
  }

  if (loading || !dipendente) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Registro presenze</h1>
          <p className={styles.user}>
            {dipendente.nome} {dipendente.cognome}
          </p>
        </div>
        <div className={styles.headerActions}>
          {dipendente.role === "ADMIN" && (
            <a href="/admin" className={styles.adminLink}>Admin</a>
          )}
          <button type="button" onClick={handleLogout} className={styles.logout}>
            Esci
          </button>
        </div>
      </header>

      <section className={styles.actions}>
        <p className={styles.gpsHint}>
          {gpsStatus === "loading" && "⏳ Lettura GPS in corso..."}
          {gpsStatus === "ok" && "✓ Posizione acquisita"}
          {gpsStatus === "error" && "⚠ Abilita la posizione nel browser e riprova"}
          {gpsStatus === "idle" && "Clicca Entrata o Uscita: verrà registrata la posizione GPS"}
        </p>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.entrata}
            onClick={() => handleTimbratura("ENTRATA")}
            disabled={actionLoading !== null}
          >
            {actionLoading === "ENTRATA" ? "..." : "Entrata"}
          </button>
          <button
            type="button"
            className={styles.uscita}
            onClick={() => handleTimbratura("USCITA")}
            disabled={actionLoading !== null}
          >
            {actionLoading === "USCITA" ? "..." : "Uscita"}
          </button>
        </div>
      </section>

      <section className={styles.listSection}>
        <div className={styles.filters}>
          <label>
            Mese
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportLoading || !monthYear}
            className={styles.exportBtn}
          >
            {exportLoading ? "..." : "Esporta Excel (mensile)"}
          </button>
        </div>
        <h2>Timbrature del mese</h2>
        <ul className={styles.list}>
          {timbrature.length === 0 ? (
            <li className={styles.empty}>Nessuna presenza nel periodo selezionato</li>
          ) : (
            timbrature.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={t.tipo === "ENTRATA" ? styles.badgeEntrata : styles.badgeUscita}>
                  {t.tipo}
                </span>
                <span className={styles.itemTime}>
                  {format(new Date(t.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                </span>
                <span className={styles.itemPlace}>
                  {t.indirizzo
                    ? [t.indirizzo, t.citta].filter(Boolean).join(" · ")
                    : `${t.latitudine.toFixed(5)}, ${t.longitudine.toFixed(5)}`}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
