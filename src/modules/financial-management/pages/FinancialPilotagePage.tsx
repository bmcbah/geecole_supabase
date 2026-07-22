import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

type Mode = "dashboard" | "installments" | "families";

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} GNF`;
const date = (value: string | null) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR") : "—");

const situationLabels: Record<InstallmentSituation, string> = {
  upcoming: "À venir",
  due: "À échéance",
  overdue: "En retard",
  settled: "Soldée",
};

const situationSeverity: Record<InstallmentSituation, "info" | "warning" | "danger" | "success"> = {
  upcoming: "info",
  due: "warning",
  overdue: "danger",
  settled: "success",
};

function modeFromPath(pathname: string): Mode {
  if (pathname.endsWith("/echeances")) return "installments";
  if (pathname.endsWith("/familles")) return "families";
  return "dashboard";
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(";"), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(";"))].join("\n");
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

export function FinancialPilotagePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = modeFromPath(pathname);
  const { institutionId, yearId, year } = useAcademicSession();
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [installments, setInstallments] = useState<FinancialInstallmentRow[]>([]);
  const [families, setFamilies] = useState<FamilyFinancialRow[]>([]);
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
      const [summary, installmentRows, familyRows] = await Promise.all([
        getFinancialDashboard(institutionId, yearId),
        listFinancialInstallments(institutionId, yearId),
        listFamilyFinancialRows(institutionId, yearId),
      ]);
      setDashboard(summary);
      setInstallments(installmentRows);
      setFamilies(familyRows);
    } catch {
      setFailure("Impossible de charger le pilotage financier.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const cycles = useMemo(() => [...new Set(installments.map((row) => row.cycleName))].filter(Boolean).sort(), [installments]);
  const levels = useMemo(() => [...new Set(installments.filter((row) => !cycle || row.cycleName === cycle).map((row) => row.levelName))].filter(Boolean).sort(), [cycle, installments]);

  const visibleInstallments = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return installments.filter((row) => {
      const searchable = `${row.studentName} ${row.matricule} ${row.feeLabel} ${row.installmentLabel}`.toLocaleLowerCase("fr");
      return (!normalized || searchable.includes(normalized)) && (!situation || row.situation === situation) && (!cycle || row.cycleName === cycle) && (!level || row.levelName === level);
    });
  }, [cycle, installments, level, query, situation]);

  const visibleFamilies = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return families.filter((row) => {
      const searchable = `${row.guardianName} ${row.guardianPhone} ${row.students.map((student) => `${student.studentName} ${student.matricule}`).join(" ")}`.toLocaleLowerCase("fr");
      return !normalized || searchable.includes(normalized);
    });
  }, [families, query]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const title = mode === "dashboard" ? "Pilotage financier" : mode === "installments" ? "Suivi des échéances" : "Suivi des familles";
  const description = mode === "dashboard"
    ? "Suivez le recouvrement, les retards et les encaissements de l’année scolaire."
    : mode === "installments"
      ? "Identifiez les échéances soldées, à venir, exigibles et en retard."
      : "Regroupez la situation financière des enfants par responsable financier.";

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`}
        title={title}
        description={description}
        actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />}
      />

      <div className="flex flex-wrap gap-2">
        <Button label="Vue d’ensemble" icon="pi pi-chart-bar" text={mode !== "dashboard"} onClick={() => navigate("/gestion-financiere/pilotage")} />
        <Button label="Échéances" icon="pi pi-calendar-clock" text={mode !== "installments"} onClick={() => navigate("/gestion-financiere/echeances")} />
        <Button label="Familles" icon="pi pi-users" text={mode !== "families"} onClick={() => navigate("/gestion-financiere/familles")} />
      </div>

      {failure ? <Message severity="error" text={failure} /> : null}

      {mode === "dashboard" && dashboard ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="Montant facturé" value={money(dashboard.totalBilled)} />
            <Stat label="Montant encaissé" value={money(dashboard.totalCollected)} detail={`${dashboard.collectionRate.toFixed(1)} % de recouvrement`} />
            <Stat label="Reste à encaisser" value={money(dashboard.totalOutstanding)} />
            <Stat label="Encaissements aujourd’hui" value={money(dashboard.collectedToday)} detail={`${money(dashboard.collectedThisMonth)} ce mois`} />
          </section>
          <section className="grid gap-3 md:grid-cols-2">
            <button className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left" onClick={() => navigate("/gestion-financiere/echeances")}> 
              <span className="text-sm font-semibold text-red-700">Échéances en retard</span>
              <strong className="mt-2 block text-2xl text-red-900">{money(dashboard.overdueAmount)}</strong>
              <small className="text-red-700">{dashboard.overdueCount} échéance(s) à traiter</small>
            </button>
            <button className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left" onClick={() => navigate("/gestion-financiere/echeances")}> 
              <span className="text-sm font-semibold text-amber-700">À encaisser dans les 30 jours</span>
              <strong className="mt-2 block text-2xl text-amber-900">{money(dashboard.dueSoonAmount)}</strong>
              <small className="text-amber-700">{dashboard.dueSoonCount} échéance(s) à venir</small>
            </button>
          </section>
        </>
      ) : null}

      {mode === "installments" ? (
        <>
          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <span className="p-input-icon-left xl:col-span-2"><i className="pi pi-search" /><InputText className="w-full" value={query} placeholder="Élève, matricule ou frais" onChange={(event) => setQuery(event.target.value)} /></span>
            <Dropdown className="w-full" value={situation} options={[{ label: "Toutes les échéances", value: "" }, ...Object.entries(situationLabels).map(([value, label]) => ({ value, label }))]} onChange={(event) => setSituation(event.value)} />
            <Dropdown className="w-full" value={cycle} options={[{ label: "Tous les cycles", value: "" }, ...cycles.map((value) => ({ label: value, value }))]} onChange={(event) => { setCycle(event.value); setLevel(""); }} />
            <Dropdown className="w-full" value={level} options={[{ label: "Tous les niveaux", value: "" }, ...levels.map((value) => ({ label: value, value }))]} onChange={(event) => setLevel(event.value)} />
          </section>
          <div className="flex justify-end"><Button label="Exporter CSV" icon="pi pi-download" severity="secondary" outlined onClick={() => downloadCsv("echeances-financieres.csv", visibleInstallments.map((row) => ({ Élève: row.studentName, Matricule: row.matricule, Cycle: row.cycleName, Niveau: row.levelName, Frais: row.feeLabel, Échéance: row.installmentLabel, Date: row.dueDate, Montant: row.amount, Payé: row.paidAmount, Restant: row.balanceAmount, Situation: situationLabels[row.situation], "Jours de retard": row.daysLate })))} /></div>
          <DataTable value={visibleInstallments} loading={loading} paginator rows={20} rowsPerPageOptions={[20, 50, 100]} dataKey="id" emptyMessage="Aucune échéance trouvée.">
            <Column header="Élève" body={(row: FinancialInstallmentRow) => <div><strong>{row.studentName}</strong><small className="block text-slate-500">{row.matricule}</small></div>} />
            <Column header="Classement" body={(row: FinancialInstallmentRow) => <div>{row.levelName}<small className="block text-slate-500">{row.cycleName}</small></div>} />
            <Column header="Frais / échéance" body={(row: FinancialInstallmentRow) => <div>{row.feeLabel}<small className="block text-slate-500">{row.installmentLabel}</small></div>} />
            <Column field="dueDate" header="Date" body={(row: FinancialInstallmentRow) => date(row.dueDate)} sortable />
            <Column field="amount" header="Montant" body={(row: FinancialInstallmentRow) => money(row.amount)} />
            <Column field="balanceAmount" header="Restant" body={(row: FinancialInstallmentRow) => <strong>{money(row.balanceAmount)}</strong>} />
            <Column header="Situation" body={(row: FinancialInstallmentRow) => <div><Tag value={situationLabels[row.situation]} severity={situationSeverity[row.situation]} />{row.daysLate ? <small className="mt-1 block text-red-600">{row.daysLate} jour(s)</small> : null}</div>} />
            <Column header="Dossier" body={(row: FinancialInstallmentRow) => <Button label="Ouvrir" icon="pi pi-arrow-right" text onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}`)} />} />
          </DataTable>
        </>
      ) : null}

      {mode === "families" ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4"><span className="p-input-icon-left block max-w-xl"><i className="pi pi-search" /><InputText className="w-full" value={query} placeholder="Responsable, téléphone, élève ou matricule" onChange={(event) => setQuery(event.target.value)} /></span></section>
          <div className="flex justify-end"><Button label="Exporter CSV" icon="pi pi-download" severity="secondary" outlined onClick={() => downloadCsv("suivi-familles.csv", visibleFamilies.map((row) => ({ Responsable: row.guardianName, Téléphone: row.guardianPhone, Élèves: row.students.map((student) => student.studentName).join(", "), Facturé: row.totalAmount, Encaissé: row.paidAmount, Restant: row.balanceAmount, "En retard": row.overdueAmount, "Prochaine échéance": row.nextDueDate ?? "" })))} /></div>
          <DataTable value={visibleFamilies} loading={loading} paginator rows={20} rowsPerPageOptions={[20, 50]} dataKey="key" emptyMessage="Aucune famille trouvée.">
            <Column header="Responsable financier" body={(row: FamilyFinancialRow) => <div><strong>{row.guardianName}</strong><small className="block text-slate-500">{row.guardianPhone || "Téléphone non renseigné"}</small></div>} />
            <Column header="Élèves" body={(row: FamilyFinancialRow) => <div className="space-y-1">{row.students.map((student) => <div key={student.studentId}>{student.studentName}<small className="ml-2 text-slate-500">{student.matricule}</small></div>)}</div>} />
            <Column field="totalAmount" header="Facturé" body={(row: FamilyFinancialRow) => money(row.totalAmount)} />
            <Column field="paidAmount" header="Encaissé" body={(row: FamilyFinancialRow) => money(row.paidAmount)} />
            <Column field="balanceAmount" header="Restant" body={(row: FamilyFinancialRow) => <strong>{money(row.balanceAmount)}</strong>} />
            <Column field="overdueAmount" header="En retard" body={(row: FamilyFinancialRow) => row.overdueAmount > 0 ? <Tag value={money(row.overdueAmount)} severity="danger" /> : <Tag value="À jour" severity="success" />} />
            <Column field="nextDueDate" header="Prochaine échéance" body={(row: FamilyFinancialRow) => date(row.nextDueDate)} />
          </DataTable>
        </>
      ) : null}
    </div>
  );
}
