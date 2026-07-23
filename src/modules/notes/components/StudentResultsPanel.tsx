import { useEffect, useMemo, useState } from "react";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import type { Json } from "../../../shared/lib/supabase/database.types";
import {
  listStudentResults,
  type StudentBulletinSummary,
  type StudentNoteSummary,
} from "../services/student-results.service";

const resultLabels: Record<string, string> = {
  absent: "Absent",
  exempt: "Dispensé",
  postponed: "Reporté",
};

const bulletinLabels: Record<string, string> = {
  generated: "Généré",
  pending_validation: "À valider",
  validated: "Validé",
  rejected: "Rejeté",
  published: "Publié",
  replaced: "Remplacé",
};

const buttonReset =
  "appearance-none border-0 bg-transparent p-0 font-inherit text-inherit shadow-none outline-none";

type SnapshotSubject = {
  name?: string;
  average?: number | null;
  coefficient?: number;
  appreciation?: string;
};

type BulletinSnapshot = {
  subjects?: SnapshotSubject[];
  general_average?: number | null;
  grading_scale?: number;
  rank?: number;
  class_size?: number;
};

function readSnapshot(value: Json): BulletinSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as unknown as BulletinSnapshot;
}

function bulletinSeverity(status: string) {
  if (status === "published" || status === "validated") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "pending_validation") return "warning" as const;
  return "info" as const;
}

export function StudentResultsPanel(props: {
  institutionId: string;
  yearId: string;
  studentId: string;
}) {
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
        setSelectedPeriod(
          (current) =>
            current || data.notes[0]?.periodName || data.bulletins[0]?.periodName || "",
        );
      })
      .catch(() => setError("Impossible de charger les notes et bulletins."))
      .finally(() => setLoading(false));
  }, [props.institutionId, props.studentId, props.yearId]);

  const periods = useMemo(
    () =>
      Array.from(
        new Set([
          ...notes.map((item) => item.periodName),
          ...bulletins.map((item) => item.periodName),
        ]),
      ).filter(Boolean),
    [bulletins, notes],
  );

  const periodNotes = useMemo(
    () => notes.filter((item) => item.periodName === selectedPeriod),
    [notes, selectedPeriod],
  );

  const periodBulletins = useMemo(
    () =>
      bulletins
        .filter((item) => item.periodName === selectedPeriod)
        .sort((left, right) => right.version - left.version),
    [bulletins, selectedPeriod],
  );

  const latestBulletin = periodBulletins[0];
  const latestSnapshot = latestBulletin ? readSnapshot(latestBulletin.snapshot) : {};

  const subjects = useMemo(() => {
    return Array.from(new Set(periodNotes.map((item) => item.subjectName)))
      .sort((left, right) => left.localeCompare(right, "fr"))
      .map((subjectName) => {
        const subjectNotes = periodNotes
          .filter((item) => item.subjectName === subjectName)
          .sort((left, right) => left.date.localeCompare(right.date));
        const officialLine = latestSnapshot.subjects?.find(
          (item) => item.name === subjectName,
        );
        return {
          subjectName,
          notes: subjectNotes,
          officialAverage:
            typeof officialLine?.average === "number" ? officialLine.average : null,
          coefficient: officialLine?.coefficient,
          appreciation: officialLine?.appreciation ?? "",
        };
      });
  }, [latestSnapshot.subjects, periodNotes]);

  if (error) return <Message severity="error" text={error} />;

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto border-b border-slate-200 bg-white">
        <div className="flex min-w-max items-center gap-6 px-1">
          {periods.map((period) => {
            const hasBulletin = bulletins.some((item) => item.periodName === period);
            const active = selectedPeriod === period;
            return (
              <button
                key={period}
                type="button"
                className={`${buttonReset} relative flex h-11 items-center gap-2 px-1 text-sm font-medium transition ${
                  active ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"
                }`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period}
                {hasBulletin ? <i className="pi pi-file-pdf text-xs" /> : null}
                {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <Message severity="info" text="Chargement des résultats…" /> : null}

      {selectedPeriod ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="grid gap-4 border-b border-slate-200 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-950">Résultats — {selectedPeriod}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Toutes les évaluations sont regroupées par matière. La moyenne affichée est celle du dernier bulletin généré.
              </p>
            </div>
            {latestBulletin ? (
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="text-right">
                  <span className="block text-xs text-slate-500">Moyenne générale</span>
                  <strong className="text-lg text-slate-950">
                    {typeof latestSnapshot.general_average === "number"
                      ? `${latestSnapshot.general_average.toFixed(2)} / ${latestSnapshot.grading_scale ?? "—"}`
                      : "—"}
                  </strong>
                </div>
                {latestSnapshot.rank ? (
                  <div className="text-right">
                    <span className="block text-xs text-slate-500">Classement</span>
                    <strong className="text-lg text-slate-950">
                      {latestSnapshot.rank}/{latestSnapshot.class_size ?? "—"}
                    </strong>
                  </div>
                ) : null}
                <Tag
                  value={bulletinLabels[latestBulletin.status] ?? latestBulletin.status}
                  severity={bulletinSeverity(latestBulletin.status)}
                />
              </div>
            ) : (
              <Tag value="Bulletin non généré" severity="secondary" />
            )}
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                <tr>
                  <th className="w-56 border-b border-slate-200 px-4 py-3">Matière</th>
                  <th className="border-b border-slate-200 px-4 py-3">Évaluations</th>
                  <th className="w-44 border-b border-slate-200 px-4 py-3 text-right">Moyenne</th>
                  <th className="w-48 border-b border-slate-200 px-4 py-3">Appréciation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((subject) => (
                  <tr key={subject.subjectName} className="align-top">
                    <td className="px-4 py-4">
                      <strong className="block text-sm font-semibold text-slate-950">{subject.subjectName}</strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {subject.notes.length} évaluation{subject.notes.length > 1 ? "s" : ""}
                        {subject.coefficient ? ` · Coef. ${subject.coefficient}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="divide-y divide-slate-100">
                        {subject.notes.map((note) => (
                          <div
                            key={note.id}
                            className="grid gap-3 py-2 sm:grid-cols-[minmax(0,1fr)_110px_120px] sm:items-center"
                          >
                            <div>
                              <strong className="block text-sm font-medium text-slate-900">{note.label}</strong>
                              <span className="text-xs text-slate-500">
                                {new Date(note.date).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">Barème {note.scale}</span>
                            <div className="sm:text-right">
                              {note.status ? (
                                <Tag
                                  value={resultLabels[note.status] ?? note.status}
                                  severity={note.status === "postponed" ? "warning" : "secondary"}
                                />
                              ) : (
                                <strong className="text-sm text-slate-950">{note.score} / {note.scale}</strong>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {subject.officialAverage === null ? (
                        <span className="text-sm text-slate-400">Non calculée</span>
                      ) : (
                        <>
                          <strong className="block text-lg font-semibold text-slate-950">
                            {subject.officialAverage.toFixed(2)} / {latestSnapshot.grading_scale ?? "—"}
                          </strong>
                          <span className="text-xs text-slate-500">Formule du bulletin</span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                      {subject.appreciation || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!subjects.length && !loading ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">
              Aucune note enregistrée pour cette période.
            </div>
          ) : null}
        </section>
      ) : !loading ? (
        <Message severity="info" text="Aucune période ne contient encore de résultats." />
      ) : null}

      {periodBulletins.length > 1 ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-4 py-3">
            <h3 className="m-0 text-sm font-semibold text-slate-950">Versions du bulletin</h3>
            <p className="mt-1 text-xs text-slate-500">Historique immuable de la période sélectionnée.</p>
          </header>
          <div className="divide-y divide-slate-100">
            {periodBulletins.map((bulletin) => (
              <div key={bulletin.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <strong className="block text-sm text-slate-900">Version {bulletin.version}</strong>
                  <span className="text-xs text-slate-500">
                    {new Date(bulletin.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <Tag
                  value={bulletinLabels[bulletin.status] ?? bulletin.status}
                  severity={bulletinSeverity(bulletin.status)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
