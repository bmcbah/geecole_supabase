import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, type DataTableExpandedRows } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  listFamilyFinancialRows,
  listFinancialInstallments,
  type FamilyFinancialRow,
  type FinancialInstallmentRow,
} from "../services/financial-pilotage.service";

type FamilySituation = "all" | "overdue" | "outstanding" | "settled" | "missing_guardian";

type StudentFinancialSummary = {
  studentId: string;
  accountId: string | null;
  studentName: string;
  matricule: string;
  cycleName: string;
  levelName: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  overdueAmount: number;
  nextDueDate: string | null;
};

type FamilyWorkspaceRow = FamilyFinancialRow & {
  children: StudentFinancialSummary[];
};

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} GNF`;
const formatDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR") : "—";

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

function aggregateStudent(
  student: FamilyFinancialRow["students"][number],
  installments: FinancialInstallmentRow[],
): StudentFinancialSummary {
  const rows = installments.filter((row) => row.studentId === student.studentId);
  const openRows = rows.filter((row) => row.balanceAmount > 0);
  return {
    studentId: student.studentId,
    accountId: rows[0]?.accountId ?? null,
    studentName: student.studentName,
    matricule: student.matricule,
    cycleName: rows[0]?.cycleName ?? "—",
    levelName: rows[0]?.levelName ?? "—",
    totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
    paidAmount: rows.reduce((sum, row) => sum + row.paidAmount, 0),
    balanceAmount: rows.reduce((sum, row) => sum + row.balanceAmount, 0),
    overdueAmount: rows
      .filter((row) => row.situation === "overdue")
      .reduce((sum, row) => sum + row.balanceAmount, 0),
    nextDueDate: openRows.map((row) => row.dueDate).sort()[0] ?? null,
  };
}

export function FinancialFamiliesWorkspacePage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [families, setFamilies] = useState<FamilyWorkspaceRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<DataTableExpandedRows>({});
  const [query, setQuery] = useState("");
  const [situation, setSituation] = useState<FamilySituation>("all");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [familyRows, installmentRows] = await Promise.all([
        listFamilyFinancialRows(institutionId, yearId),
        listFinancialInstallments(institutionId, yearId),
      ]);
      setFamilies(
        familyRows.map((family) => ({
          ...family,
          children: family.students.map((student) => aggregateStudent(student, installmentRows)),
        })),
      );
    } catch {
      setFailure("Impossible de charger les comptes familles.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const visibleFamilies = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return families.filter((family) => {
      const searchable = `${family.guardianName} ${family.guardianPhone} ${family.children
        .map((child) => `${child.studentName} ${child.matricule}`)
        .join(" ")}`.toLocaleLowerCase("fr");
      const matchesQuery = !normalized || searchable.includes(normalized);
      const matchesSituation =
        situation === "all" ||
        (situation === "overdue" && family.overdueAmount > 0) ||
        (situation === "outstanding" && family.balanceAmount > 0) ||
        (situation === "settled" && family.balanceAmount <= 0) ||
        (situation === "missing_guardian" && !family.guardianId);
      return matchesQuery && matchesSituation;
    });
  }, [families, query, situation]);

  const summary = useMemo(
    () => ({
      families: visibleFamilies.length,
      children: visibleFamilies.reduce((sum, family) => sum + family.children.length, 0),
      outstanding: visibleFamilies.reduce((sum, family) => sum + family.balanceAmount, 0),
      overdue: visibleFamilies.reduce((sum, family) => sum + family.overdueAmount, 0),
    }),
    [visibleFamilies],
  );

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const rowExpansionTemplate = (family: FamilyWorkspaceRow) => (
    <div className="space-y-3 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <strong>Dossiers des enfants</strong>
          <small className="mt-1 block text-slate-500">
            Chaque enfant conserve son propre dossier financier et ses propres échéances.
          </small>
        </div>
        <Tag
          value={`${family.children.length} enfant${family.children.length > 1 ? "s" : ""}`}
          severity="info"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {family.children.map((child) => {
          const progress = child.totalAmount > 0 ? Math.min(100, (child.paidAmount / child.totalAmount) * 100) : 0;
          return (
            <article key={child.studentId} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-base text-slate-900">{child.studentName}</strong>
                  <small className="mt-1 block text-slate-500">
                    {child.matricule} · {child.levelName} · {child.cycleName}
                  </small>
                </div>
                {child.overdueAmount > 0 ? (
                  <Tag value="En retard" severity="danger" />
                ) : child.balanceAmount > 0 ? (
                  <Tag value="À payer" severity="warning" />
                ) : (
                  <Tag value="Soldé" severity="success" />
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="block text-slate-500">Facturé</span>
                  <strong>{money(child.totalAmount)}</strong>
                </div>
                <div>
                  <span className="block text-slate-500">Payé</span>
                  <strong>{money(child.paidAmount)}</strong>
                </div>
                <div>
                  <span className="block text-slate-500">Restant</span>
                  <strong className={child.balanceAmount > 0 ? "text-amber-700" : "text-emerald-700"}>
                    {money(child.balanceAmount)}
                  </strong>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                  <span>Avancement du paiement</span>
                  <span>{progress.toFixed(0)} %</span>
                </div>
                <ProgressBar value={progress} showValue={false} style={{ height: "0.5rem" }} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="text-sm">
                  {child.overdueAmount > 0 ? (
                    <span className="font-medium text-red-700">{money(child.overdueAmount)} en retard</span>
                  ) : (
                    <span className="text-slate-500">Prochaine échéance : {formatDate(child.nextDueDate)}</span>
                  )}
                </div>
                <Button
                  label="Ouvrir le dossier"
                  icon="pi pi-arrow-right"
                  text
                  disabled={!child.accountId}
                  onClick={() => child.accountId && navigate(`/gestion-financiere/dossiers/${child.accountId}`)}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`}
        title="Comptes familles"
        description="Identifiez une famille, comprenez sa situation globale et accédez aux dossiers financiers de chaque enfant."
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

      <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-4">
        <div><small className="text-slate-500">Familles affichées</small><strong className="mt-1 block text-xl">{summary.families}</strong></div>
        <div><small className="text-slate-500">Enfants concernés</small><strong className="mt-1 block text-xl">{summary.children}</strong></div>
        <div><small className="text-slate-500">Reste à payer</small><strong className="mt-1 block text-xl">{money(summary.outstanding)}</strong></div>
        <div><small className="text-slate-500">Montant en retard</small><strong className="mt-1 block text-xl text-red-700">{money(summary.overdue)}</strong></div>
      </section>

      <section className="grid items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 xl:grid-cols-[minmax(340px,1fr)_220px_auto]">
        <span className="p-input-icon-left min-w-0">
          <i className="pi pi-search" />
          <InputText
            className="w-full"
            value={query}
            placeholder="Responsable, téléphone, enfant ou matricule"
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
        <Dropdown
          className="w-full"
          value={situation}
          options={[
            { label: "Toutes les familles", value: "all" },
            { label: "Avec retard", value: "overdue" },
            { label: "Avec reste à payer", value: "outstanding" },
            { label: "Soldées", value: "settled" },
            { label: "Responsable manquant", value: "missing_guardian" },
          ]}
          onChange={(event) => setSituation(event.value)}
        />
        <Button
          label="Exporter"
          icon="pi pi-download"
          severity="secondary"
          outlined
          onClick={() =>
            downloadCsv(
              "comptes-familles.csv",
              visibleFamilies.flatMap((family) =>
                family.children.map((child) => ({
                  Responsable: family.guardianName,
                  Téléphone: family.guardianPhone,
                  Enfant: child.studentName,
                  Matricule: child.matricule,
                  Niveau: child.levelName,
                  Facturé: child.totalAmount,
                  Payé: child.paidAmount,
                  Restant: child.balanceAmount,
                  Retard: child.overdueAmount,
                })),
              ),
            )
          }
        />
      </section>

      <DataTable
        value={visibleFamilies}
        dataKey="key"
        loading={loading}
        paginator
        rows={15}
        rowsPerPageOptions={[15, 30, 50]}
        expandedRows={expandedRows}
        onRowToggle={(event) => setExpandedRows(event.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        emptyMessage="Aucune famille ne correspond aux critères."
      >
        <Column expander style={{ width: "3rem" }} />
        <Column
          header="Famille"
          body={(family: FamilyWorkspaceRow) => (
            <div>
              <strong>{family.guardianName}</strong>
              <small className="mt-1 block text-slate-500">
                {family.guardianPhone || "Téléphone non renseigné"}
              </small>
              {!family.guardianId ? <Tag className="mt-2" value="Responsable à compléter" severity="warning" /> : null}
            </div>
          )}
        />
        <Column
          header="Enfants"
          body={(family: FamilyWorkspaceRow) => (
            <div>
              <strong>{family.children.length}</strong>
              <small className="mt-1 block text-slate-500">
                {family.children.map((child) => child.studentName).join(", ")}
              </small>
            </div>
          )}
        />
        <Column header="Facturé" body={(family: FamilyWorkspaceRow) => money(family.totalAmount)} />
        <Column header="Payé" body={(family: FamilyWorkspaceRow) => money(family.paidAmount)} />
        <Column
          header="Reste à payer"
          body={(family: FamilyWorkspaceRow) => <strong>{money(family.balanceAmount)}</strong>}
          sortable
          field="balanceAmount"
        />
        <Column
          header="Retard"
          body={(family: FamilyWorkspaceRow) =>
            family.overdueAmount > 0 ? (
              <Tag value={money(family.overdueAmount)} severity="danger" />
            ) : (
              <span className="text-slate-500">Aucun</span>
            )
          }
        />
        <Column
          header="Prochaine échéance"
          body={(family: FamilyWorkspaceRow) => formatDate(family.nextDueDate)}
        />
      </DataTable>
    </div>
  );
}
