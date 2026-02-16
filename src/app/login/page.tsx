"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, cognome, password }),
      });
      let data: { error?: string; debug?: unknown } = {};
      try {
        data = await res.json();
      } catch {
        setError(`Errore di connessione: risposta non valida (${res.status}). Avvia il server con npm run dev e apri http://localhost:3000`);
        return;
      }
      if (!res.ok) {
        const msg = data.error || "Login fallito";
        const debug = data.debug ? ` (${JSON.stringify(data.debug)})` : "";
        setError(msg + debug);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto";
      setError(`Errore di connessione: ${msg}. Verifica che il server sia avviato (npm run dev) e che tu sia su http://localhost:3000`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>⏱</div>
          <h1>Registro presenze</h1>
          <p>Inserisci nome, cognome e password assegnata</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <label>
            Nome
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Mario"
              required
              autoComplete="given-name"
            />
          </label>
          <label>
            Cognome
            <input
              type="text"
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              placeholder="Rossi"
              required
              autoComplete="family-name"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading} className={styles.submit}>
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
