import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  getFinancialDashboard,
  listFamilyFinancialRows,
  listFinancialInstallments,
  type FamilyFinancialRow,
  type FinancialDashboard,
  type FinancialInstallmentRow,
  type InstallmentSituation,
} from "../services/financial-pilotage.service";

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} GNF`;
const date = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR") : "—";

const situationLabels: Record<InstallmentSituation, string> = {
  upcoming: "À venir",
  due: "À échéance",
  overdue: "En retard",
  settled: "Soldée",
};

const situationSeverity: Record<
  InstallmentSituation,
  "info" | "warning" | "danger" | "success"
> = {
  upcoming: "info",
  due: "warning",
  overdue: "danger",
  settled: "success",
};

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(";"),
    ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(";")),
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="m-0 text-sm text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl text-slate-900">{value}</strong>
      {detail ? <small className="mt-1 block text-slate-500">{detail}</small> : null}
    </div>
  );
}

export function FinancialDashboardPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setDashboard(await getFinancialDashboard(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger la vue financière.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`}
        title="Vue financière"
        description="Consultez la situation financière globale de l’année scolaire."
        actions={
          <Button
            label="Actualiser"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            loading={loading}
            onClick={() => void load()}
          />
        }
      />
      {failure ? <Message severity="error" text={failure} /> : null}
      {dashboard ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Stat label="Montant facturé" value={money(dashboard.totalBilled)} />
          <Stat
            label="Montant encaissé"
            value={money(dashboard.totalCollected)}
            detail={`${dashboard.collectionRate.toFixed(1)} % de recouvrement`}
          />
          <Stat label="Reste à encaisser" value={money(dashboard.totalOutstanding)} />
          <Stat
            label="Encaissements aujourd’hui"
            value={money(dashboard.collectedToday)}
            detail={`${money(dashboard.collectedThisMonth)} ce mois`}
          />
        </section>
      ) : null}
    </div>
  );
}

export function FinancialInstallmentsPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<FinancialInstallmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [situation, setSituation] = useState<InstallmentSituation | "">("");
  const [cycle, setCycle] = useState("");
  const [level, setLevel] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setItems(await listFinancialInstallments(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger les échéances.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const cycles = useMemo(
    () => [...new Set(items.map((row) => row.cycleName))].filter(Boolean).sort(),
    [items],
  );
  const levels = useMemo(
    () =>
      [...new Set(items.filter((row) => !cycle || row.cycleName === cycle).map((row) => row.levelName))]
        .filter(Boolean)
        .sort(),
    [cycle, items],
  );
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return items.filter((row) => {
      const searchable = `${row.studentName} ${row.matricule} ${row.feeLabel} ${row.installmentLabel}`.toLocaleLowerCase("fr");
      return (
        (!normalized || searchable.includes(normalized)) &&
        (!situation || row.situation === situation) &&
        (!cycle || row.cycleName === cycle) &&
        (!level || row.levelName === level)
      );
    });
  }, [cycle, items, level, query, situation]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`}
        title="Échéances"
        description="Listez et contrôlez les échéances soldées, à venir, exigibles ou en retard."
        actions={
          <Button
            label="Actualiser"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            loading={loading}
            onClick={() => void load()}
          />
        }
      />
      {failure ? <Message severity="error" text={failure} /> : null}
      <section className="grid items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 xl:grid-cols-[minmax(260px,2fr)_180px_180px_180px_auto]">
        <span className="p-input-icon-left min-w-0">
          <i className="pi pi-search" />
          <InputText
            className="w-full"
            value={query}
            placeholder="Élève, matricule ou frais"
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
        <Dropdown
          className="w-full"
          value={situation}
          options={[
            { label: "Toutes les situations", value: "" },
            ...Object.entries(situationLabels).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(event) => setSituation(event.value)}
        />
        <Dropdown
          className="w-full"
          value={cycle}
          options={[{ label: "Tous les cycles", value: "" }, ...cycles.map((value) => ({ label: value, value }))]}
          onChange={(event) => {
            setCycle(event.value);
            setLevel("");
          }}
        />
        <Dropdown
          className="w-full"
          value={level}
          options={[{ label: "Tous les niveaux", value: "" }, ...levels.map((value) => ({ label: value, value }))]}
          onChange={(event) => setLevel(event.value)}
        />
        <Button
          label="Exporter CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          onClick={() =>
            downloadCsv(
              "echeances-financieres.csv",
              visible.map((row) => ({
                Élève: row.studentName,
                Matricule: row.matricule,
                Cycle: row.cycleName,
                Niveau: row.levelName,
                Frais: row.feeLabel,
                Échéance: row.installmentLabel,
                Date: row.dueDate,
                Montant: row.amount,
                Payé: row.paidAmount,
                Restant: row.balanceAmount,
                Situation: situationLabels[row.situation],
                "Jours de retard": row.daysLate,
              })),
            )
          }
        />
      </section>
      <DataTable
        value={visible}
        loading={loading}
        paginator
        rows={20}
        rowsPerPageOptions={[20, 50, 100]}
        dataKey="id"
        emptyMessage="Aucune échéance trouvée."
      >
        <Column
          header="Élève"
          body={(row: FinancialInstallmentRow) => (
            <div>
              <strong>{row.studentName}</strong>
              <small className="block text-slate-500">{row.matricule}</small>
            </div>
          )}
        />
        <Column
          header="Niveau"
          body={(row: FinancialInstallmentRow) => (
            <div>
              {row.levelName}
              <small className="block text-slate-500">{row.cycleName}</small>
            </div>
          )}
        />
        <Column
          header="Frais / échéance"
          body={(row: FinancialInstallmentRow) => (
            <div>
              {row.feeLabel}
              <small className="block text-slate-500">{row.installmentLabel}</small>
            </div>
          )}
        />
        <Column field="dueDate" header="Date" body={(row: FinancialInstallmentRow) => date(row.dueDate)} sortable />
        <Column field="amount" header="Montant" body={(row: FinancialInstallmentRow) => money(row.amount)} />
        <Column field="balanceAmount" header="Restant" body={(row: FinancialInstallmentRow) => <strong>{money(row.balanceAmount)}</strong>} />
        <Column
          header="Situation"
          body={(row: FinancialInstallmentRow) => (
            <div>
              <Tag value={situationLabels[row.situation]} severity={situationSeverity[row.situation]} />
              {row.daysLate ? <small className="mt-1 block text-red-600">{row.daysLate} jour(s)</small> : null}
            </div>
          )}
        />
        <Column
          header="Action"
          body={(row: FinancialInstallmentRow) => (
            <Button
              label="Ouvrir"
              icon="pi pi-arrow-right"
              text
              onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}`)}
            />
          )}
        />
      </DataTable>
    </div>
  );
}

export function FinancialFamiliesPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<FamilyFinancialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setItems(await listFamilyFinancialRows(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger le suivi des familles.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return items.filter((row) => {
      const searchable = `${row.guardianName} ${row.guardianPhone} ${row.students
        .map((student) => `${student.studentName} ${student.matricule}`)
        .join(" ")}`.toLocaleLowerCase("fr");
      return !normalized || searchable.includes(normalized);
    });
  }, [items, query]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`}
        title="Suivi des familles"
        description="Consultez la situation consolidée des enfants liés à un même responsable financier."
        actions={
          <Button
            label="Actualiser"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            loading={loading}
            onClick={() => void load()}
          />
        }
      />
      {failure ? <Message severity="error" text={failure} /> : null}
      <section className="grid items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 xl:grid-cols-[minmax(320px,1fr)_auto]">
        <span className="p-input-icon-left min-w-0">
          <i className="pi pi-search" />
          <InputText
            className="w-full"
            value={query}
            placeholder="Responsable, téléphone, élève ou matricule"
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
        <Button
          label="Exporter CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          onClick={() =>
            downloadCsv(
              "suivi-familles.csv",
              visible.map((row) => ({
                Responsable: row.guardianName,
                Téléphone: row.guardianPhone,
                Élèves: row.students.map((student) => student.studentName).join(", "),
                Facturé: row.totalAmount,
                Encaissé: row.paidAmount,
                Restant: row.balanceAmount,
                "En retard": row.overdueAmount,
                "Prochaine échéance": row.nextDueDate ?? "",
              })),
            )
          }
        />
      </section>
      <DataTable
        value={visible}
        loading={loading}
        paginator
        rows={20}
        rowsPerPageOptions={[20, 50]}
        dataKey="key"
        emptyMessage="Aucune famille trouvée."
      >
        <Column
          header="Responsable financier"
          body={(row: FamilyFinancialRow) => (
            <div>
              <strong>{row.guardianName}</strong>
              <small className="block text-slate-500">{row.guardianPhone || "Téléphone non renseigné"}</small>
            </div>
          )}
        />
        <Column
          header="Élèves"
          body={(row: FamilyFinancialRow) => row.students.map((student) => student.studentName).join(", ")}
        />
        <Column header="Facturé" body={(row: FamilyFinancialRow) => money(row.totalAmount)} />
        <Column header="Encaissé" body={(row: FamilyFinancialRow) => money(row.paidAmount)} />
        <Column header="Restant" body={(row: FamilyFinancialRow) => <strong>{money(row.balanceAmount)}</strong>} />
        <Column header="En retard" body={(row: FamilyFinancialRow) => money(row.overdueAmount)} />
        <Column header="Prochaine échéance" body={(row: FamilyFinancialRow) => date(row.nextDueDate)} />
      </DataTable>
    </div>
  );
}
