"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type DipendenteRow = {
  id: string;
  nome: string;
  cognome: string;
  role: string;
  createdAt: string;
  _count: { timbrature: number };
};

type PresenzaRow = {
  id: string;
  tipo: string;
  latitudine: number;
  longitudine: number;
  indirizzo: string | null;
  citta: string | null;
  createdAt: string;
  dipendenteId: string;
  dipendente: { id: string; nome: string; cognome: string };
};

export default function AdminPage() {
  const router = useRouter();
  const [dipendenti, setDipendenti] = useState<DipendenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    password: "",
    nome: "",
    cognome: "",
    role: "DIPENDENTE",
  });

  const [tab, setTab] = useState<"dipendenti" | "presenze">("dipendenti");
  const [presenze, setPresenze] = useState<PresenzaRow[]>([]);
  const [presenzeLoading, setPresenzeLoading] = useState(false);
  const [filtriPresenze, setFiltriPresenze] = useState({
    dipendenteId: "",
    da: format(new Date(), "yyyy-MM-01"),
    a: format(new Date(), "yyyy-MM-dd"),
  });

  const loadDipendenti = useCallback(async () => {
    const res = await fetch("/api/admin/dipendenti");
    if (res.status === 403) {
      setIsAdmin(false);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setDipendenti(data);
    setIsAdmin(true);
  }, []);

  const loadPresenze = useCallback(async () => {
    setPresenzeLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtriPresenze.dipendenteId) params.set("dipendenteId", filtriPresenze.dipendenteId);
      if (filtriPresenze.da) params.set("da", filtriPresenze.da);
      if (filtriPresenze.a) params.set("a", filtriPresenze.a);
      const res = await fetch(`/api/admin/presenze?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPresenze(data);
      } else setPresenze([]);
    } finally {
      setPresenzeLoading(false);
    }
  }, [filtriPresenze.dipendenteId, filtriPresenze.da, filtriPresenze.a]);

  useEffect(() => {
    (async () => {
      await loadDipendenti();
      setLoading(false);
    })();
  }, [loadDipendenti]);

  useEffect(() => {
    if (isAdmin && tab === "presenze") loadPresenze();
  }, [isAdmin, tab, loadPresenze]);

  useEffect(() => {
    if (!loading && !isAdmin && dipendenti.length === 0) {
      router.replace("/dashboard");
    }
  }, [loading, isAdmin, dipendenti.length, router]);

  function openCreate() {
    setEditingId(null);
    setForm({ password: "", nome: "", cognome: "", role: "DIPENDENTE" });
    setError("");
    setFormOpen(true);
  }

  function openEdit(d: DipendenteRow) {
    setEditingId(d.id);
    setForm({
      password: "",
      nome: d.nome,
      cognome: d.cognome,
      role: d.role,
    });
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        const body: Record<string, string> = {
          nome: form.nome,
          cognome: form.cognome,
          role: form.role,
        };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/admin/dipendenti/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Errore aggiornamento");
          return;
        }
        await loadDipendenti();
        setFormOpen(false);
      } else {
        const res = await fetch("/api/admin/dipendenti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Errore creazione");
          return;
        }
        await loadDipendenti();
        setFormOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo dipendente? Verranno eliminate anche tutte le sue timbrature.")) return;
    const res = await fetch(`/api/admin/dipendenti/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore eliminazione");
      return;
    }
    await loadDipendenti();
  }

  function handleExportPresenze() {
    const params = new URLSearchParams();
    if (filtriPresenze.dipendenteId) params.set("dipendenteId", filtriPresenze.dipendenteId);
    if (filtriPresenze.da) params.set("da", filtriPresenze.da);
    if (filtriPresenze.a) params.set("a", filtriPresenze.a);
    window.open(`/api/admin/presenze/export?${params.toString()}`, "_blank");
  }

  const presenzeOrdinate = [...presenze].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const lastEntrataPerDip: Record<string, Date> = {};
  function getOreLavorate(row: PresenzaRow): string {
    if (row.tipo === "ENTRATA") {
      lastEntrataPerDip[row.dipendenteId] = new Date(row.createdAt);
      return "—";
    }
    const lastE = lastEntrataPerDip[row.dipendenteId];
    if (!lastE) return "—";
    const ore = (new Date(row.createdAt).getTime() - lastE.getTime()) / (1000 * 60 * 60);
    delete lastEntrataPerDip[row.dipendenteId];
    return `${Math.round(ore * 100) / 100} h`;
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Admin</h1>
          <p className={styles.subtitle}>
            {tab === "dipendenti"
              ? "Gestione dipendenti e registro presenze"
              : "Controlla entrate e uscite di tutti i dipendenti"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <a href="/dashboard" className={styles.backLink}>← Dashboard</a>
          {tab === "dipendenti" && (
            <button type="button" onClick={openCreate} className={styles.addBtn}>
              Aggiungi dipendente
            </button>
          )}
          {tab === "presenze" && (
            <button type="button" onClick={handleExportPresenze} className={styles.addBtn}>
              Esporta Excel
            </button>
          )}
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === "dipendenti" ? styles.tabActive : styles.tab}
          onClick={() => setTab("dipendenti")}
        >
          Gestione dipendenti
        </button>
        <button
          type="button"
          className={tab === "presenze" ? styles.tabActive : styles.tab}
          onClick={() => setTab("presenze")}
        >
          Registro presenze
        </button>
      </div>

      {tab === "dipendenti" && formOpen && (
        <div className={styles.modalOverlay} onClick={() => setFormOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Modifica dipendente" : "Nuovo dipendente"}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              <label>
                Nome
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                  placeholder="Mario"
                />
              </label>
              <label>
                Cognome
                <input
                  type="text"
                  value={form.cognome}
                  onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))}
                  required
                  placeholder="Rossi"
                />
              </label>
              <label>
                Password {editingId && "(lascia vuoto per non cambiare)"}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editingId}
                  placeholder="••••••••"
                  minLength={6}
                />
              </label>
              <label>
                Ruolo
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="DIPENDENTE">Dipendente</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setFormOpen(false)} className={styles.cancelBtn}>
                  Annulla
                </button>
                <button type="submit" disabled={saving} className={styles.submitBtn}>
                  {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === "dipendenti" && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cognome</th>
                <th>Nome</th>
                <th>Ruolo</th>
                <th>Presenze</th>
                <th>Registrato il</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dipendenti.map((d) => (
                <tr key={d.id}>
                  <td>{d.cognome}</td>
                  <td>{d.nome}</td>
                  <td>
                    <span className={d.role === "ADMIN" ? styles.badgeAdmin : styles.badgeDipendente}>
                      {d.role === "ADMIN" ? "Admin" : "Dipendente"}
                    </span>
                  </td>
                  <td>{d._count.timbrature}</td>
                  <td>{format(new Date(d.createdAt), "dd/MM/yyyy", { locale: it })}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" onClick={() => openEdit(d)} className={styles.editBtn}>
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className={styles.deleteBtn}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dipendenti.length === 0 && (
            <p className={styles.empty}>Nessun dipendente. Clicca &quot;Aggiungi dipendente&quot;.</p>
          )}
        </div>
      )}

      {tab === "presenze" && (
        <>
          <div className={styles.filters}>
            <label className={styles.filterLabel}>
              Dipendente
              <select
                value={filtriPresenze.dipendenteId}
                onChange={(e) =>
                  setFiltriPresenze((f) => ({ ...f, dipendenteId: e.target.value }))
                }
              >
                <option value="">Tutti</option>
                {dipendenti.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.cognome} {d.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterLabel}>
              Da
              <input
                type="date"
                value={filtriPresenze.da}
                onChange={(e) => setFiltriPresenze((f) => ({ ...f, da: e.target.value }))}
              />
            </label>
            <label className={styles.filterLabel}>
              A
              <input
                type="date"
                value={filtriPresenze.a}
                onChange={(e) => setFiltriPresenze((f) => ({ ...f, a: e.target.value }))}
              />
            </label>
            <button type="button" onClick={loadPresenze} className={styles.filterBtn}>
              Applica
            </button>
          </div>
          {presenzeLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Caricamento presenze...</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Dipendente</th>
                    <th>Data</th>
                    <th>Ora</th>
                    <th>Tipo</th>
                    <th>Ore</th>
                    <th>Indirizzo</th>
                    <th>Città</th>
                  </tr>
                </thead>
                <tbody>
                  {presenzeOrdinate.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.dipendente.cognome} {row.dipendente.nome}
                      </td>
                      <td>{format(new Date(row.createdAt), "dd/MM/yyyy", { locale: it })}</td>
                      <td>{format(new Date(row.createdAt), "HH:mm:ss", { locale: it })}</td>
                      <td>
                        <span
                          className={
                            row.tipo === "ENTRATA" ? styles.badgeEntrata : styles.badgeUscita
                          }
                        >
                          {row.tipo}
                        </span>
                      </td>
                      <td>{getOreLavorate(row)}</td>
                      <td className={styles.cellSmall}>{row.indirizzo || "—"}</td>
                      <td>{row.citta || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {presenze.length === 0 && (
                <p className={styles.empty}>
                  Nessuna presenza nel periodo selezionato. Modifica i filtri e clicca Applica.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
