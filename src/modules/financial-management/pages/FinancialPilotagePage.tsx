import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressBar } from "primereact/progressbar";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  getFinancialDashboard,
  listFinancialInstallments,
  type FinancialDashboard,
  type FinancialInstallmentRow,
  type InstallmentSituation,
} from "../services/financial-pilotage.service";

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} GNF`;
const date = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR") : "—";

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

type PaymentState = "all" | "paid" | "partial" | "unpaid";

type FeeSummary = {
  label: string;
  total: number;
  paid: number;
  balance: number;
  studentCount: number;
  settledCount: number;
  installmentCount: number;
  rows: FinancialInstallmentRow[];
};

type InstallmentSummary = {
  key: string;
  label: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  studentCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  rows: FinancialInstallmentRow[];
};

function rate(paid: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
}

function paymentState(row: FinancialInstallmentRow): Exclude<PaymentState, "all"> {
  if (row.balanceAmount <= 0) return "paid";
  if (row.paidAmount > 0) return "partial";
  return "unpaid";
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <strong className="mt-3 block text-xl font-bold tracking-tight text-slate-950">{value}</strong>
      {detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}
    </article>
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
      setFailure("Impossible de charger la vue d’ensemble financière.");
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
        title="Vue d’ensemble"
        description="Suivez en un coup d’œil les montants appelés, encaissés et restant à recouvrer."
        actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />}
      />
      {failure ? <Message severity="error" text={failure} /> : null}
      {dashboard ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-950">Situation financière</h2>
              <p className="mt-1 text-sm text-slate-500">Synthèse consolidée de l’année scolaire.</p>
            </div>
            <Tag value={`${dashboard.collectionRate.toFixed(1)} % encaissé`} severity={dashboard.collectionRate >= 75 ? "success" : dashboard.collectionRate >= 50 ? "warning" : "danger"} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Montant appelé" value={money(dashboard.totalBilled)} />
            <SummaryCard label="Déjà encaissé" value={money(dashboard.totalCollected)} detail={`${dashboard.collectionRate.toFixed(1)} % de recouvrement`} />
            <SummaryCard label="Reste à encaisser" value={money(dashboard.totalOutstanding)} detail={`${money(dashboard.overdueAmount)} en retard`} />
            <SummaryCard label="Encaissements" value={money(dashboard.collectedToday)} detail={`${money(dashboard.collectedThisMonth)} ce mois`} />
          </div>
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
  const [selectedFee, setSelectedFee] = useState("all");
  const [selectedInstallment, setSelectedInstallment] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentState>("all");
  const [query, setQuery] = useState("");
  const [cycle, setCycle] = useState("");
  const [level, setLevel] = useState("");
  const [advanced, setAdvanced] = useState(false);

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setItems(await listFinancialInstallments(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger le suivi des frais et échéances.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const cycles = useMemo(() => [...new Set(items.map((row) => row.cycleName))].filter(Boolean).sort(), [items]);
  const levels = useMemo(() => [...new Set(items.filter((row) => !cycle || row.cycleName === cycle).map((row) => row.levelName))].filter(Boolean).sort(), [cycle, items]);

  const scopedRows = useMemo(() => items.filter((row) => (!cycle || row.cycleName === cycle) && (!level || row.levelName === level)), [cycle, items, level]);

  const fees = useMemo<FeeSummary[]>(() => {
    const groups = new Map<string, FinancialInstallmentRow[]>();
    scopedRows.forEach((row) => groups.set(row.feeLabel, [...(groups.get(row.feeLabel) ?? []), row]));
    return [...groups.entries()].map(([label, rows]) => ({
      label,
      total: rows.reduce((sum, row) => sum + row.amount, 0),
      paid: rows.reduce((sum, row) => sum + row.paidAmount, 0),
      balance: rows.reduce((sum, row) => sum + row.balanceAmount, 0),
      studentCount: new Set(rows.map((row) => row.studentId)).size,
      settledCount: rows.filter((row) => row.balanceAmount <= 0).length,
      installmentCount: new Set(rows.map((row) => `${row.installmentLabel}|${row.dueDate}`)).size,
      rows,
    })).sort((left, right) => right.balance - left.balance || left.label.localeCompare(right.label, "fr"));
  }, [scopedRows]);

  const activeRows = useMemo(() => selectedFee === "all" ? scopedRows : scopedRows.filter((row) => row.feeLabel === selectedFee), [scopedRows, selectedFee]);

  const installmentSummaries = useMemo<InstallmentSummary[]>(() => {
    const groups = new Map<string, FinancialInstallmentRow[]>();
    activeRows.forEach((row) => {
      const key = `${row.installmentLabel}|${row.dueDate}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    return [...groups.entries()].map(([key, rows]) => ({
      key,
      label: rows[0].installmentLabel,
      dueDate: rows[0].dueDate,
      total: rows.reduce((sum, row) => sum + row.amount, 0),
      paid: rows.reduce((sum, row) => sum + row.paidAmount, 0),
      balance: rows.reduce((sum, row) => sum + row.balanceAmount, 0),
      studentCount: rows.length,
      paidCount: rows.filter((row) => paymentState(row) === "paid").length,
      partialCount: rows.filter((row) => paymentState(row) === "partial").length,
      unpaidCount: rows.filter((row) => paymentState(row) === "unpaid").length,
      rows,
    })).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [activeRows]);

  useEffect(() => {
    if (selectedInstallment && !installmentSummaries.some((item) => item.key === selectedInstallment)) setSelectedInstallment(null);
  }, [installmentSummaries, selectedInstallment]);

  const detailRows = useMemo(() => {
    const base = selectedInstallment ? installmentSummaries.find((item) => item.key === selectedInstallment)?.rows ?? [] : activeRows;
    const normalized = query.trim().toLocaleLowerCase("fr");
    return base.filter((row) => {
      const searchable = `${row.studentName} ${row.matricule} ${row.levelName} ${row.cycleName}`.toLocaleLowerCase("fr");
      return (!normalized || searchable.includes(normalized)) && (paymentFilter === "all" || paymentState(row) === paymentFilter);
    });
  }, [activeRows, installmentSummaries, paymentFilter, query, selectedInstallment]);

  const totalSummary = useMemo(() => ({
    total: activeRows.reduce((sum, row) => sum + row.amount, 0),
    paid: activeRows.reduce((sum, row) => sum + row.paidAmount, 0),
    balance: activeRows.reduce((sum, row) => sum + row.balanceAmount, 0),
  }), [activeRows]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`}
        title="Échéances et recouvrement"
        description="Pilotez chaque frais, chaque échéance et les élèves concernés sans reconstruire l’information."
        actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />}
      />
      {failure ? <Message severity="error" text={failure} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-950">Vue par frais</h2>
            <p className="mt-1 text-sm text-slate-500">Sélectionnez un frais pour suivre son recouvrement et ses échéances.</p>
          </div>
          <Tag value={selectedFee === "all" ? "Tous les frais" : selectedFee} severity="info" />
        </div>
        <TabView activeIndex={selectedFee === "all" ? 0 : Math.max(1, fees.findIndex((fee) => fee.label === selectedFee) + 1)} onTabChange={(event) => { setSelectedFee(event.index === 0 ? "all" : fees[event.index - 1]?.label ?? "all"); setSelectedInstallment(null); setPaymentFilter("all"); }} scrollable>
          <TabPanel header="Tous les frais" />
          {fees.map((fee) => <TabPanel key={fee.label} header={`${fee.label} · ${rate(fee.paid, fee.total)} %`} />)}
        </TabView>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Montant attendu" value={money(totalSummary.total)} />
          <SummaryCard label="Montant encaissé" value={money(totalSummary.paid)} detail={`${rate(totalSummary.paid, totalSummary.total)} % encaissé`} />
          <SummaryCard label="Reste à recouvrer" value={money(totalSummary.balance)} />
          <SummaryCard label="Échéances" value={String(installmentSummaries.length)} detail={`${new Set(activeRows.map((row) => row.studentId)).size} élève(s) concerné(s)`} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-950">Progression des échéances</h2>
              <p className="mt-1 text-sm text-slate-500">Cliquez sur une échéance pour afficher les élèves qui ont payé, partiellement payé ou pas encore payé.</p>
            </div>
            {selectedInstallment ? <Button label="Voir toutes les échéances" icon="pi pi-times" severity="secondary" text onClick={() => { setSelectedInstallment(null); setPaymentFilter("all"); }} /> : null}
          </div>
        </div>
        <DataTable value={installmentSummaries} loading={loading} dataKey="key" emptyMessage="Aucune échéance pour ce frais." rowClassName={(row) => row.key === selectedInstallment ? "bg-emerald-50 cursor-pointer" : "cursor-pointer"} onRowClick={(event) => { setSelectedInstallment(event.data.key); setPaymentFilter("all"); }}>
          <Column header="Échéance" body={(row: InstallmentSummary) => <div><strong className="text-slate-950">{row.label}</strong><span className="mt-1 block text-xs text-slate-500">Prévue le {date(row.dueDate)}</span></div>} />
          <Column header="Progression" body={(row: InstallmentSummary) => <div className="min-w-48"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>{money(row.paid)} encaissé</span><strong>{rate(row.paid, row.total)} %</strong></div><ProgressBar value={rate(row.paid, row.total)} showValue={false} style={{ height: "0.5rem" }} /></div>} />
          <Column header="Attendu" body={(row: InstallmentSummary) => money(row.total)} />
          <Column header="Restant" body={(row: InstallmentSummary) => <strong className={row.balance > 0 ? "text-orange-700" : "text-emerald-700"}>{money(row.balance)}</strong>} />
          <Column header="Élèves" body={(row: InstallmentSummary) => <div className="flex flex-wrap gap-1"><Tag value={`${row.paidCount} payés`} severity="success" /><Tag value={`${row.partialCount} partiels`} severity="warning" /><Tag value={`${row.unpaidCount} non payés`} severity="danger" /></div>} />
          <Column header="Action" body={(row: InstallmentSummary) => <Button label="Voir qui manque" icon="pi pi-users" size="small" severity="secondary" outlined onClick={(event) => { event.stopPropagation(); setSelectedInstallment(row.key); setPaymentFilter("unpaid"); }} />} />
        </DataTable>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-950">Élèves concernés</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedInstallment ? installmentSummaries.find((item) => item.key === selectedInstallment)?.label : "Toutes les échéances du frais sélectionné"}</p>
            </div>
            <div className="flex gap-2">
              {(["all", "paid", "partial", "unpaid"] as PaymentState[]).map((value) => <Button key={value} label={{ all: "Tous", paid: "Payés", partial: "Partiels", unpaid: "Non payés" }[value]} severity={paymentFilter === value ? undefined : "secondary"} outlined={paymentFilter !== value} size="small" onClick={() => setPaymentFilter(value)} />)}
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex min-w-max items-end gap-2 overflow-x-auto">
            <label className="w-[320px]"><span className="mb-1 block text-xs font-semibold text-slate-600">Recherche</span><span className="p-input-icon-left block"><i className="pi pi-search" /><InputText value={query} className="h-11 w-full rounded-xl pl-9" placeholder="Élève ou matricule" onChange={(event) => setQuery(event.target.value)} /></span></label>
            <Button label={advanced ? "Masquer les filtres" : "Plus de filtres"} icon="pi pi-sliders-h" severity="secondary" outlined onClick={() => setAdvanced((value) => !value)} />
          </div>
          {advanced ? <div className="mt-3 flex min-w-max gap-2 overflow-x-auto border-t border-slate-100 pt-3"><Dropdown value={cycle} className="w-52" options={[{ label: "Tous les cycles", value: "" }, ...cycles.map((value) => ({ label: value, value }))]} onChange={(event) => { setCycle(event.value); setLevel(""); }} /><Dropdown value={level} className="w-52" options={[{ label: "Tous les niveaux", value: "" }, ...levels.map((value) => ({ label: value, value }))]} onChange={(event) => setLevel(event.value)} /></div> : null}
        </div>
        <DataTable value={detailRows} paginator rows={20} rowsPerPageOptions={[20, 50, 100]} dataKey="id" emptyMessage="Aucun élève ne correspond à cette situation.">
          <Column header="Élève" body={(row: FinancialInstallmentRow) => <div><strong className="text-slate-950">{row.studentName}</strong><span className="mt-1 block text-xs text-slate-500">{row.matricule}</span></div>} />
          <Column header="Classe" body={(row: FinancialInstallmentRow) => <div>{row.levelName}<span className="mt-1 block text-xs text-slate-500">{row.cycleName}</span></div>} />
          <Column header="Échéance" body={(row: FinancialInstallmentRow) => <div>{row.installmentLabel}<span className="mt-1 block text-xs text-slate-500">{date(row.dueDate)}</span></div>} />
          <Column header="Attendu" body={(row: FinancialInstallmentRow) => money(row.amount)} />
          <Column header="Payé" body={(row: FinancialInstallmentRow) => <span className="font-semibold text-emerald-700">{money(row.paidAmount)}</span>} />
          <Column header="Restant" body={(row: FinancialInstallmentRow) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{money(row.balanceAmount)}</strong>} />
          <Column header="Situation" body={(row: FinancialInstallmentRow) => <div><Tag value={paymentState(row) === "paid" ? "Payé" : paymentState(row) === "partial" ? "Partiel" : "Non payé"} severity={paymentState(row) === "paid" ? "success" : paymentState(row) === "partial" ? "warning" : "danger"} />{row.situation === "overdue" ? <span className="mt-1 block text-xs text-red-600">{row.daysLate} jour(s) de retard</span> : null}</div>} />
          <Column header="Action" body={(row: FinancialInstallmentRow) => <Button label="Ouvrir le dossier" icon="pi pi-arrow-right" text onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}`)} />} />
        </DataTable>
      </section>
    </div>
  );
}

export function FinancialFamiliesPage() {
  return <Message severity="info" text="Le regroupement des fratries est disponible depuis les dossiers financiers." />;
}
