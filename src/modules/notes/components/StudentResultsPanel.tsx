import { useEffect, useState } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
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

export function StudentResultsPanel(props: {
  institutionId: string;
  yearId: string;
  studentId: string;
}) {
  const [notes, setNotes] = useState<StudentNoteSummary[]>([]);
  const [bulletins, setBulletins] = useState<StudentBulletinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    void listStudentResults(props.institutionId, props.yearId, props.studentId)
      .then((data) => {
        setNotes(data.notes);
        setBulletins(data.bulletins);
      })
      .catch(() => setError("Impossible de charger les notes et bulletins."))
      .finally(() => setLoading(false));
  }, [props.institutionId, props.studentId, props.yearId]);

  if (error) return <Message severity="error" text={error} />;

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">Notes</h2>
          <p className="text-sm text-slate-500">
            Résultats de l’année scolaire sélectionnée.
          </p>
        </div>
        <DataTable
          value={notes}
          loading={loading}
          dataKey="id"
          size="small"
          stripedRows
          paginator={notes.length > 10}
          rows={10}
          emptyMessage="Aucune note enregistrée pour cette année."
        >
          <Column field="periodName" header="Période" />
          <Column field="subjectName" header="Matière" />
          <Column field="label" header="Évaluation" />
          <Column
            header="Résultat"
            body={(row: StudentNoteSummary) =>
              row.status ? (
                <Tag
                  value={resultLabels[row.status] ?? row.status}
                  severity={
                    row.status === "postponed" ? "warning" : "secondary"
                  }
                />
              ) : (
                <strong>
                  {row.score} / {row.scale}
                </strong>
              )
            }
          />
        </DataTable>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">Bulletins</h2>
          <p className="text-sm text-slate-500">
            Versions générées et publiées.
          </p>
        </div>
        <DataTable
          value={bulletins}
          loading={loading}
          dataKey="id"
          size="small"
          stripedRows
          emptyMessage="Aucun bulletin généré pour cette année."
        >
          <Column field="periodName" header="Période" />
          <Column
            field="version"
            header="Version"
            body={(row: StudentBulletinSummary) => `v${row.version}`}
          />
          <Column
            field="status"
            header="État"
            body={(row: StudentBulletinSummary) => (
              <Tag
                value={bulletinLabels[row.status] ?? row.status}
                severity={
                  row.status === "published"
                    ? "success"
                    : row.status === "rejected"
                      ? "danger"
                      : "info"
                }
              />
            )}
          />
          <Column
            field="createdAt"
            header="Généré le"
            body={(row: StudentBulletinSummary) =>
              new Date(row.createdAt).toLocaleDateString("fr-FR")
            }
          />
        </DataTable>
      </section>
    </div>
  );
}
