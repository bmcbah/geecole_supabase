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
import { Tree } from "primereact/tree";
import type { TreeNode } from "primereact/treenode";
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
const rate = (paid: number, total: number) => total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
const labels: Record<InstallmentSituation, string> = { upcoming: "À venir", due: "À échéance", overdue: "En retard", settled: "Soldée" };
const methodLabels: Record<string, string> = { cash: "Espèces", orange_money: "Orange Money", mtn_momo: "MTN MoMo", bank_transfer: "Virement", bank_deposit: "Dépôt bancaire", cheque: "Chèque", card: "Carte", unknown: "Autre" };

function paymentState(row: FinancialInstallmentRow) {
  if (row.balanceAmount <= 0) return "paid" as const;
  if (row.paidAmount > 0) return "partial" as const;
  return "unpaid" as const;
}

function SummaryCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail?: string; tone?: "default" | "danger" | "success" | "warning" }) {
  const toneClass = tone === "danger" ? "border-red-200 bg-red-50/70" : tone === "success" ? "border-emerald-200 bg-emerald-50/70" : tone === "warning" ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-slate-50/70";
  return <article className={`rounded-xl border p-4 ${toneClass}`}><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className="mt-2 block text-xl text-slate-950">{value}</strong>{detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}</article>;
}

export function FinancialDashboardPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try { setDashboard(await getFinancialDashboard(institutionId, yearId)); }
    catch { setFailure("Impossible de charger la vue d’ensemble financière."); }
    finally { setLoading(false); }
  }, [institutionId, yearId]);

  useEffect(() => { void load(); }, [load]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`} title="Vue d’ensemble" description="Une vue opérationnelle pour décider quoi encaisser, relancer et contrôler aujourd’hui." actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />} />
      {failure ? <Message severity="error" text={failure} /> : null}
      {dashboard ? <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-base font-semibold text-slate-950">Situation globale</h2><p className="mt-1 text-sm text-slate-500">Position financière de l’année scolaire.</p></div><Tag value={`${dashboard.collectionRate.toFixed(1)} % encaissé`} severity={dashboard.collectionRate >= 75 ? "success" : dashboard.collectionRate >= 50 ? "warning" : "danger"} /></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Montant appelé" value={money(dashboard.totalBilled)} detail={`${dashboard.accountCount} dossiers`} />
            <SummaryCard label="Déjà encaissé" value={money(dashboard.totalCollected)} detail={`${dashboard.collectionRate.toFixed(1)} % de recouvrement`} tone="success" />
            <SummaryCard label="Reste à encaisser" value={money(dashboard.totalOutstanding)} detail={`${dashboard.partialAccountCount + dashboard.unpaidAccountCount} dossiers ouverts`} tone="warning" />
            <SummaryCard label="Retards" value={money(dashboard.overdueAmount)} detail={`${dashboard.overdueStudentCount} élèves · ${dashboard.overdueCount} échéances`} tone="danger" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="m-0 text-base font-semibold text-slate-950">Travail du jour</h2><p className="mt-1 text-sm text-slate-500">Les volumes qui parlent directement à la caisse et au recouvrement.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="Encaissé aujourd’hui" value={money(dashboard.collectedToday)} detail={`${dashboard.paymentCountToday} paiement(s)`} tone="success" />
              <SummaryCard label="Encaissé ce mois" value={money(dashboard.collectedThisMonth)} detail={`${dashboard.paymentCountThisMonth} paiement(s)`} />
              <SummaryCard label="Échéances du jour" value={money(dashboard.dueTodayAmount)} detail={`${dashboard.dueTodayCount} échéance(s)`} tone="warning" />
              <SummaryCard label="À venir sous 30 jours" value={money(dashboard.dueSoonAmount)} detail={`${dashboard.dueSoonCount} échéance(s)`} />
              <SummaryCard label="Paiement moyen" value={money(dashboard.averagePaymentAmount)} detail="Sur le mois en cours" />
              <SummaryCard label="Dossier moyen" value={money(dashboard.averageAccountAmount)} detail="Montant moyen appelé" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="m-0 text-base font-semibold text-slate-950">État des dossiers</h2><p className="mt-1 text-sm text-slate-500">Répartition immédiatement exploitable.</p></div>
            <div className="space-y-4">
              {[
                ["Soldés", dashboard.settledAccountCount, "success"],
                ["Partiellement payés", dashboard.partialAccountCount, "warning"],
                ["Aucun paiement", dashboard.unpaidAccountCount, "danger"],
              ].map(([label, value, severity]) => {
                const count = Number(value);
                const percent = dashboard.accountCount ? Math.round((count / dashboard.accountCount) * 100) : 0;
                return <div key={String(label)}><div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">{label}</span><Tag value={`${count} · ${percent} %`} severity={severity as "success" | "warning" | "danger"} /></div><ProgressBar value={percent} showValue={false} style={{ height: "0.45rem" }} /></div>;
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3"><h2 className="m-0 text-base font-semibold text-slate-950">Performance par cycle</h2><p className="mt-1 text-sm text-slate-500">Comparer les volumes et les taux de recouvrement.</p></div>
            <div className="max-w-full overflow-x-auto"><DataTable value={dashboard.cycles} dataKey="label" tableStyle={{ minWidth: "660px" }} emptyMessage="Aucune donnée par cycle."><Column field="label" header="Cycle" style={{ minWidth: "160px" }} /><Column header="Appelé" style={{ minWidth: "130px" }} body={(row) => money(row.total)} /><Column header="Encaissé" style={{ minWidth: "130px" }} body={(row) => money(row.paid)} /><Column header="Reste" style={{ minWidth: "130px" }} body={(row) => <strong className="text-orange-700">{money(row.balance)}</strong>} /><Column header="Taux" style={{ minWidth: "120px" }} body={(row) => <Tag value={`${row.rate.toFixed(1)} %`} severity={row.rate >= 75 ? "success" : row.rate >= 50 ? "warning" : "danger"} />} /></DataTable></div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3"><h2 className="m-0 text-base font-semibold text-slate-950">Modes d’encaissement du mois</h2><p className="mt-1 text-sm text-slate-500">Répartition utile pour la caisse et le rapprochement.</p></div>
            <div className="max-w-full overflow-x-auto"><DataTable value={dashboard.methods} dataKey="method" tableStyle={{ minWidth: "560px" }} emptyMessage="Aucun encaissement ce mois."><Column header="Mode" style={{ minWidth: "180px" }} body={(row) => methodLabels[row.method] ?? row.method} /><Column field="count" header="Opérations" style={{ minWidth: "120px" }} /><Column header="Montant" style={{ minWidth: "150px" }} body={(row) => <strong>{money(row.amount)}</strong>} /><Column header="Part" style={{ minWidth: "110px" }} body={(row) => <Tag value={`${dashboard.collectedThisMonth ? ((row.amount / dashboard.collectedThisMonth) * 100).toFixed(1) : "0.0"} %`} severity="info" />} /></DataTable></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h2 className="m-0 text-base font-semibold text-slate-950">Dossiers prioritaires</h2><p className="mt-1 text-sm text-slate-500">Les retards les plus importants à traiter en premier.</p></div><Button label="Ouvrir le recouvrement" icon="pi pi-arrow-right" text onClick={() => navigate("/gestion-financiere/echeances")} /></div>
          <div className="max-w-full overflow-x-auto"><DataTable value={dashboard.urgentAccounts} dataKey="accountId" tableStyle={{ minWidth: "900px" }} emptyMessage="Aucun dossier en retard."><Column header="Élève" frozen style={{ minWidth: "230px" }} body={(row) => <div><strong className="text-slate-950">{row.studentName}</strong><span className="mt-1 block text-xs text-slate-500">{row.matricule} · {row.levelName}</span></div>} /><Column header="Retard" style={{ minWidth: "120px" }} body={(row) => <Tag value={`${row.maxDaysLate} jour(s)`} severity="danger" />} /><Column header="Montant en retard" style={{ minWidth: "170px" }} body={(row) => <strong className="text-red-700">{money(row.overdueAmount)}</strong>} /><Column header="Solde dossier" style={{ minWidth: "160px" }} body={(row) => money(row.balanceAmount)} /><Column header="" style={{ minWidth: "150px" }} body={(row) => <Button label="Traiter" icon="pi pi-arrow-right" size="small" onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}`)} />} /></DataTable></div>
        </section>
      </> : null}
    </div>
  );
}

type ScopeData = { cycle?: string; level?: string; fee?: string; installmentKey?: string };

export function FinancialInstallmentsPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<FinancialInstallmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "partial" | "unpaid">("all");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try { setItems(await listFinancialInstallments(institutionId, yearId)); }
    catch { setFailure("Impossible de charger les échéances."); }
    finally { setLoading(false); }
  }, [institutionId, yearId]);

  useEffect(() => { void load(); }, [load]);

  const treeNodes = useMemo<TreeNode[]>(() => {
    const cycles = new Map<string, FinancialInstallmentRow[]>();
    for (const row of items) cycles.set(row.cycleName, [...(cycles.get(row.cycleName) ?? []), row]);
    return [...cycles.entries()].sort(([a], [b]) => a.localeCompare(b, "fr")).map(([cycleName, cycleRows]) => ({
      key: `cycle:${cycleName}`,
      label: cycleName,
      icon: "pi pi-sitemap",
      data: { cycle: cycleName } satisfies ScopeData,
      children: [...new Set(cycleRows.map((row) => row.levelName))].sort().map((levelName) => {
        const levelRows = cycleRows.filter((row) => row.levelName === levelName);
        return {
          key: `level:${cycleName}:${levelName}`,
          label: levelName,
          icon: "pi pi-building",
          data: { cycle: cycleName, level: levelName } satisfies ScopeData,
          children: [...new Set(levelRows.map((row) => row.feeLabel))].sort().map((feeLabel) => {
            const feeRows = levelRows.filter((row) => row.feeLabel === feeLabel);
            return {
              key: `fee:${cycleName}:${levelName}:${feeLabel}`,
              label: feeLabel,
              icon: "pi pi-wallet",
              data: { cycle: cycleName, level: levelName, fee: feeLabel } satisfies ScopeData,
              children: [...new Map(feeRows.map((row) => [`${row.installmentLabel}|${row.dueDate}`, row])).entries()].map(([key, row]) => ({
                key: `installment:${cycleName}:${levelName}:${feeLabel}:${key}`,
                label: `${row.installmentLabel} · ${date(row.dueDate)}`,
                icon: row.situation === "overdue" ? "pi pi-exclamation-circle" : "pi pi-calendar",
                data: { cycle: cycleName, level: levelName, fee: feeLabel, installmentKey: key } satisfies ScopeData,
              })),
            };
          }),
        };
      }),
    }));
  }, [items]);

  const selectedScope = useMemo<ScopeData>(() => {
    if (!selectedKey) return {};
    const stack = [...treeNodes];
    while (stack.length) {
      const node = stack.shift();
      if (String(node?.key) === selectedKey) return (node?.data ?? {}) as ScopeData;
      if (node?.children) stack.push(...node.children);
    }
    return {};
  }, [selectedKey, treeNodes]);

  const scopedRows = useMemo(() => items.filter((row) => {
    const key = `${row.installmentLabel}|${row.dueDate}`;
    return (!selectedScope.cycle || row.cycleName === selectedScope.cycle)
      && (!selectedScope.level || row.levelName === selectedScope.level)
      && (!selectedScope.fee || row.feeLabel === selectedScope.fee)
      && (!selectedScope.installmentKey || key === selectedScope.installmentKey);
  }), [items, selectedScope]);

  const situations: Array<InstallmentSituation | "action"> = ["action", "overdue", "upcoming", "settled"];
  const activeSituation = situations[activeTab] ?? "action";
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return scopedRows.filter((row) => {
      const inTab = activeSituation === "action" ? row.balanceAmount > 0 : row.situation === activeSituation;
      const inPayment = paymentFilter === "all" || paymentState(row) === paymentFilter;
      const searchable = `${row.studentName} ${row.matricule} ${row.levelName} ${row.feeLabel}`.toLocaleLowerCase("fr");
      return inTab && inPayment && (!normalized || searchable.includes(normalized));
    });
  }, [activeSituation, paymentFilter, query, scopedRows]);

  const summary = useMemo(() => ({
    expected: scopedRows.reduce((sum, row) => sum + row.amount, 0),
    paid: scopedRows.reduce((sum, row) => sum + row.paidAmount, 0),
    balance: scopedRows.reduce((sum, row) => sum + row.balanceAmount, 0),
    overdue: scopedRows.filter((row) => row.situation === "overdue").reduce((sum, row) => sum + row.balanceAmount, 0),
  }), [scopedRows]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`} title="Échéances et recouvrement" description="Parcourez le périmètre dans l’arbre, puis traitez les situations dans une zone de travail stable." actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />} />
      {failure ? <Message severity="error" text={failure} /> : null}

      <section className="grid h-[calc(100vh-230px)] min-h-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-h-0 min-w-0 flex-col border-b border-slate-200 bg-slate-50/60 lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-3"><div><h2 className="m-0 text-sm font-semibold text-slate-950">Périmètre</h2><p className="mt-1 text-xs text-slate-500">Cycle → niveau → frais → échéance</p></div><Button icon="pi pi-times" rounded text severity="secondary" aria-label="Tout afficher" onClick={() => setSelectedKey(null)} /></div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <Tree value={treeNodes} selectionMode="single" selectionKeys={selectedKey ?? undefined} expandedKeys={expandedKeys} onToggle={(event) => setExpandedKeys(event.value as Record<string, boolean>)} onSelectionChange={(event) => setSelectedKey(typeof event.value === "string" ? event.value : null)} className="min-w-[280px] border-0 bg-transparent p-0 text-sm" />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Attendu" value={money(summary.expected)} /><SummaryCard label="Encaissé" value={money(summary.paid)} detail={`${rate(summary.paid, summary.expected)} %`} tone="success" /><SummaryCard label="Reste" value={money(summary.balance)} tone="warning" /><SummaryCard label="En retard" value={money(summary.overdue)} tone="danger" /></div>
          </div>

          <div className="shrink-0 border-b border-slate-200 px-4 pt-2"><TabView activeIndex={activeTab} onTabChange={(event) => { setActiveTab(event.index); setPaymentFilter("all"); }}><TabPanel header="À traiter" /><TabPanel header="En retard" /><TabPanel header="À venir" /><TabPanel header="Soldées" /></TabView></div>

          <div className="shrink-0 overflow-x-auto border-b border-slate-200 p-3"><div className="flex min-w-max items-end gap-2"><label className="w-[300px]"><span className="mb-1 block text-xs font-semibold text-slate-600">Recherche</span><span className="p-input-icon-left block"><i className="pi pi-search" /><InputText value={query} className="h-10 w-full rounded-lg pl-9" placeholder="Élève ou matricule" onChange={(event) => setQuery(event.target.value)} /></span></label><Dropdown value={paymentFilter} className="h-10 w-48" options={[{ label: "Tous les paiements", value: "all" }, { label: "Payés", value: "paid" }, { label: "Partiels", value: "partial" }, { label: "Non payés", value: "unpaid" }]} onChange={(event) => setPaymentFilter(event.value)} />{selectedKey ? <Button label="Tout le périmètre" icon="pi pi-filter-slash" severity="secondary" text onClick={() => setSelectedKey(null)} /> : null}</div></div>

          <div className="min-h-0 flex-1 overflow-auto">
            <DataTable value={filteredRows} dataKey="id" paginator rows={20} rowsPerPageOptions={[20, 50, 100]} loading={loading} emptyMessage="Aucune échéance dans cette vue." stripedRows scrollable scrollHeight="flex" tableStyle={{ minWidth: "1180px" }}>
              <Column header="Élève" frozen style={{ minWidth: "230px" }} body={(row: FinancialInstallmentRow) => <div className="min-w-0"><strong className="block truncate text-slate-950">{row.studentName}</strong><span className="mt-1 block truncate text-xs text-slate-500">{row.matricule} · {row.levelName}</span></div>} />
              <Column header="Frais / échéance" style={{ minWidth: "250px" }} body={(row: FinancialInstallmentRow) => <div className="min-w-0"><strong className="block truncate">{row.feeLabel}</strong><span className="mt-1 block truncate text-xs text-slate-500">{row.installmentLabel} · {date(row.dueDate)}</span></div>} />
              <Column header="Progression" style={{ minWidth: "190px" }} body={(row: FinancialInstallmentRow) => <div className="min-w-40"><div className="mb-1 flex justify-between text-xs"><span>{money(row.paidAmount)}</span><strong>{rate(row.paidAmount, row.amount)} %</strong></div><ProgressBar value={rate(row.paidAmount, row.amount)} showValue={false} style={{ height: "0.45rem" }} /></div>} />
              <Column header="Restant" style={{ minWidth: "150px" }} body={(row: FinancialInstallmentRow) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{money(row.balanceAmount)}</strong>} />
              <Column header="Situation" style={{ minWidth: "150px" }} body={(row: FinancialInstallmentRow) => <div><Tag value={labels[row.situation]} severity={row.situation === "overdue" ? "danger" : row.situation === "settled" ? "success" : "info"} />{row.daysLate > 0 ? <span className="mt-1 block text-xs text-red-600">{row.daysLate} jour(s) de retard</span> : null}</div>} />
              <Column header="Actions" style={{ minWidth: "210px" }} body={(row: FinancialInstallmentRow) => <div className="flex gap-1"><Button label="Dossier" icon="pi pi-folder-open" text size="small" onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}`)} /><Button label="Encaisser" icon="pi pi-wallet" size="small" disabled={row.balanceAmount <= 0} onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}/encaissement`)} /></div>} />
            </DataTable>
          </div>
        </div>
      </section>
    </div>
  );
}

export function FinancialFamiliesPage() {
  return <Message severity="info" text="Le regroupement des fratries est disponible depuis les dossiers financiers." />;
}
