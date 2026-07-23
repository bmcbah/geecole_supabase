import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { listStudentResults, type StudentBulletinSummary, type StudentNoteSummary } from "../services/student-results.service";

const resultLabels: Record<string, string> = { absent: "Absent", exempt: "Dispensé", postponed: "Reporté" };
const bulletinLabels: Record<string, string> = { generated: "Généré", pending_validation: "À valider", validated: "Validé", rejected: "Rejeté", published: "Publié", replaced: "Remplacé" };

export function StudentResultsPanel(props: { institutionId: string; yearId: string; studentId: string }) {
  const [notes, setNotes] = useState<StudentNoteSummary[]>([]);
  const [bulletins, setBulletins] = useState<StudentBulletinSummary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    void listStudentResults(props.institutionId, props.yearId, props.studentId)
      .then((data) => {
        setNotes(data.notes);
        setBulletins(data.bulletins);
        const first = data.notes[0]?.periodName ?? data.bulletins[0]?.periodName ?? "";
        setSelectedPeriod((current) => current || first);
      })
      .catch(() => setError("Impossible de charger les notes et bulletins."))
      .finally(() => setLoading(false));
  }, [props.institutionId, props.studentId, props.yearId]);

  const periods = useMemo(() => Array.from(new Set([...notes.map((item) => item.periodName), ...bulletins.map((item) => item.periodName)])).filter(Boolean), [bulletins, notes]);
  const periodNotes = notes.filter((item) => item.periodName === selectedPeriod);
  const periodBulletins = bulletins.filter((item) => item.periodName === selectedPeriod);
  const latestBulletin = [...periodBulletins].sort((a, b) => b.version - a.version)[0];

  if (error) return <Message severity="error" text={error} />;

  return (
    <div className="grid min-h-[520px] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3"><h2 className="text-sm font-semibold text-slate-950">Périodes</h2><p className="text-xs text-slate-500">Choisissez une période pour voir ses notes et son bulletin.</p></div>
        <div className="space-y-1">
          {periods.map((period) => {
            const bulletin = bulletins.find((item) => item.periodName === period);
            return <button key={period} type="button" className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${selectedPeriod === period ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-emerald-50"}`} onClick={() => setSelectedPeriod(period)}><span>{period}</span>{bulletin ? <i className="pi pi-file-pdf text-xs" title="Bulletin disponible" /> : <i className="pi pi-clock text-xs opacity-60" title="Bulletin non généré" />}</button>;
          })}
          {!periods.length && !loading ? <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">Aucune période avec des résultats.</p> : null}
        </div>
      </aside>

      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-950">{selectedPeriod || "Résultats"}</h2><p className="text-sm text-slate-500">Notes enregistrées pour la période sélectionnée.</p></div><Tag value={`${periodNotes.length} note(s)`} severity="secondary" /></div>
          <DataTable value={periodNotes} loading={loading} dataKey="id" size="small" stripedRows emptyMessage="Aucune note pour cette période.">
            <Column field="subjectName" header="Matière" />
            <Column field="label" header="Évaluation" />
            <Column header="Résultat" body={(row: StudentNoteSummary) => row.status ? <Tag value={resultLabels[row.status] ?? row.status} severity={row.status === "postponed" ? "warning" : "secondary"} /> : <strong>{row.score} / {row.scale}</strong>} />
          </DataTable>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-950">Bulletin de la période</h2><p className="text-sm text-slate-500">La dernière version générée est mise en avant.</p></div>{latestBulletin ? <Tag value={bulletinLabels[latestBulletin.status] ?? latestBulletin.status} severity={latestBulletin.status === "published" ? "success" : latestBulletin.status === "rejected" ? "danger" : "info"} /> : null}</div>
          {latestBulletin ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><strong className="block text-sm text-slate-900">Bulletin {selectedPeriod} · v{latestBulletin.version}</strong><span className="text-xs text-slate-500">Généré le {new Date(latestBulletin.createdAt).toLocaleDateString("fr-FR")}</span></div><i className="pi pi-file-pdf text-2xl text-emerald-600" /></div> : <Message severity="info" text="Aucun bulletin n’a encore été généré pour cette période." />}
          {periodBulletins.length > 1 ? <div className="mt-3"><DataTable value={periodBulletins} dataKey="id" size="small"><Column field="version" header="Version" body={(row: StudentBulletinSummary) => `v${row.version}`} /><Column header="État" body={(row: StudentBulletinSummary) => bulletinLabels[row.status] ?? row.status} /><Column header="Date" body={(row: StudentBulletinSummary) => new Date(row.createdAt).toLocaleDateString("fr-FR")} /></DataTable></div> : null}
        </section>
      </div>
    </div>
  );
}
