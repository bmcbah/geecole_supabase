import { useEffect, useMemo, useState } from "react";
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
    setLoading(true); setError("");
    void listStudentResults(props.institutionId, props.yearId, props.studentId)
      .then((data) => {
        setNotes(data.notes); setBulletins(data.bulletins);
        setSelectedPeriod((current) => current || data.notes[0]?.periodName || data.bulletins[0]?.periodName || "");
      })
      .catch(() => setError("Impossible de charger les notes et bulletins."))
      .finally(() => setLoading(false));
  }, [props.institutionId, props.studentId, props.yearId]);

  const periods = useMemo(() => Array.from(new Set([...notes.map((item) => item.periodName), ...bulletins.map((item) => item.periodName)])).filter(Boolean), [bulletins, notes]);
  const subjects = useMemo(() => {
    const scoped = notes.filter((item) => item.periodName === selectedPeriod);
    return Array.from(new Set(scoped.map((item) => item.subjectName))).map((subjectName) => {
      const subjectNotes = scoped.filter((item) => item.subjectName === subjectName);
      const numeric = subjectNotes.filter((item) => item.score !== null && !item.status);
      const average = numeric.length ? numeric.reduce((sum, item) => sum + ((item.score ?? 0) / item.scale) * 20, 0) / numeric.length : null;
      return { subjectName, notes: subjectNotes, average };
    });
  }, [notes, selectedPeriod]);
  const periodBulletins = bulletins.filter((item) => item.periodName === selectedPeriod);

  if (error) return <Message severity="error" text={error} />;

  return <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
    <aside className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Périodes</p>
      <div className="space-y-1">{periods.map((period) => {
        const hasBulletin = bulletins.some((item) => item.periodName === period);
        return <button key={period} type="button" className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedPeriod === period ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`} onClick={() => setSelectedPeriod(period)}><span>{period}</span>{hasBulletin ? <i className="pi pi-file-pdf text-xs" /> : null}</button>;
      })}</div>
      {!periods.length && !loading ? <p className="p-2 text-xs text-slate-500">Aucune période disponible.</p> : null}
    </aside>

    <div className="space-y-3">
      {loading ? <Message severity="info" text="Chargement des résultats…" /> : null}
      {subjects.map((subject) => <section key={subject.subjectName} className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><h3 className="text-sm font-semibold text-slate-950">{subject.subjectName}</h3><p className="text-xs text-slate-500">{subject.notes.length} note(s)</p></div>
          <div className="text-right"><span className="block text-xs text-slate-500">Moyenne simple normalisée</span><strong className="text-lg text-slate-950">{subject.average === null ? "—" : `${subject.average.toFixed(2)} / 20`}</strong></div>
        </header>
        <div className="divide-y divide-slate-100">{subject.notes.map((note) => <div key={note.id} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
          <div><strong className="block text-sm text-slate-900">{note.label}</strong><span className="text-xs text-slate-500">{new Date(note.date).toLocaleDateString("fr-FR")}</span></div>
          <span className="text-sm text-slate-600">Barème {note.scale}</span>
          <div className="text-right">{note.status ? <Tag value={resultLabels[note.status] ?? note.status} severity={note.status === "postponed" ? "warning" : "secondary"} /> : <strong>{note.score} / {note.scale}</strong>}</div>
        </div>)}</div>
      </section>)}
      {!subjects.length && !loading ? <Message severity="info" text="Aucune note enregistrée pour cette période." /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-950">Bulletin de la période</h3><p className="text-xs text-slate-500">Versions générées pour {selectedPeriod || "la période"}.</p></div><Tag value={String(periodBulletins.length)} severity="secondary" /></div>
        <div className="space-y-2">{periodBulletins.map((bulletin) => <div key={bulletin.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"><span><strong className="block text-sm">Version {bulletin.version}</strong><small className="text-slate-500">{new Date(bulletin.createdAt).toLocaleDateString("fr-FR")}</small></span><Tag value={bulletinLabels[bulletin.status] ?? bulletin.status} severity={bulletin.status === "published" ? "success" : bulletin.status === "rejected" ? "danger" : "info"} /></div>)}</div>
        {!periodBulletins.length ? <p className="text-sm text-slate-500">Aucun bulletin généré pour cette période.</p> : null}
      </section>
    </div>
  </div>;
}