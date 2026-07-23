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

const situationLabels: Record<InstallmentSituation, string> = {
  upcoming: "À venir",
  due: "À échéance",
  overdue: "En retard",
  settled: "Soldée",
};

function paymentState(row: FinancialInstallmentRow) {
  if (row.balanceAmount <= 0) return "paid" as const;
  if (row.paidAmount > 0) return "partial" as const;
  return "unpaid" as const;
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className="mt-2 block text-xl text-slate-950">{value}</strong>{detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}</article>;
}

export function FinancialDashboardPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true); setFailure("");
    try { setDashboard(await getFinancialDashboard(institutionId, yearId)); }
    catch { setFailure("Impossible de charger la vue d’ensemble financière."); }
    finally { setLoading(false); }
  }, [institutionId, yearId]);
  useEffect(() => { void load(); }, [load]);
  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return <div className="space-y-4 pb-8"><PageHeader eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`} title="Vue d’ensemble" description="Suivez les montants appelés, encaissés et restant à recouvrer." actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />} />{failure ? <Message severity="error" text={failure} /> : null}{dashboard ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Montant appelé" value={money(dashboard.totalBilled)} /><SummaryCard label="Déjà encaissé" value={money(dashboard.totalCollected)} detail={`${dashboard.collectionRate.toFixed(1)} % de recouvrement`} /><SummaryCard label="Reste à encaisser" value={money(dashboard.totalOutstanding)} detail={`${money(dashboard.overdueAmount)} en retard`} /><SummaryCard label="Encaissements" value={money(dashboard.collectedToday)} detail={`${money(dashboard.collectedThisMonth)} ce mois`} /></div></section> : null}</div>;
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
    setLoading(true); setFailure("");
    try { setItems(await listFinancialInstallments(institutionId, yearId)); }
    catch { setFailure("Impossible de charger les échéances."); }
    finally { setLoading(false); }
  }, [institutionId, yearId]);
  useEffect(() => { void load(); }, [load]);

  const installmentKeys = useMemo(() => new Map(items.map((row) => [`${row.installmentLabel}|${row.dueDate}`, row])), [items]);

  const treeNodes = useMemo<TreeNode[]>(() => {
    const cycles = new Map<string, FinancialInstallmentRow[]>();
    items.forEach((row) => cycles.set(row.cycleName, [...(cycles.get(row.cycleName) ?? []), row]));
    return [...cycles.entries()].sort(([a], [b]) => a.localeCompare(b, "fr")).map(([cycleName, cycleRows]) => ({
      key: `cycle:${cycleName}`, label: cycleName, icon: "pi pi-sitemap", data: { cycle: cycleName } satisfies ScopeData,
      children: [...new Set(cycleRows.map((row) => row.levelName))].sort().map((levelName) => {
        const levelRows = cycleRows.filter((row) => row.levelName === levelName);
        return {
          key: `level:${cycleName}:${levelName}`, label: levelName, icon: "pi pi-building", data: { cycle: cycleName, level: levelName } satisfies ScopeData,
          children: [...new Set(levelRows.map((row) => row.feeLabel))].sort().map((feeLabel) => {
            const feeRows = levelRows.filter((row) => row.feeLabel === feeLabel);
            const feeBalance = feeRows.reduce((sum, row) => sum + row.balanceAmount, 0);
            return {
              key: `fee:${cycleName}:${levelName}:${feeLabel}`, label: `${feeLabel} · ${money(feeBalance)}`, icon: "pi pi-wallet", data: { cycle: cycleName, level: levelName, fee: feeLabel } satisfies ScopeData,
              children: [...new Map(feeRows.map((row) => [`${row.installmentLabel}|${row.dueDate}`, row])).entries()].map(([key, row]) => ({
                key: `installment:${cycleName}:${levelName}:${feeLabel}:${key}`, label: `${row.installmentLabel} · ${date(row.dueDate)}`, icon: row.situation === "overdue" ? "pi pi-exclamation-circle" : "pi pi-calendar", data: { cycle: cycleName, level: levelName, fee: feeLabel, installmentKey: key } satisfies ScopeData,
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
    const installmentKey = `${row.installmentLabel}|${row.dueDate}`;
    return (!selectedScope.cycle || row.cycleName === selectedScope.cycle)
      && (!selectedScope.level || row.levelName === selectedScope.level)
      && (!selectedScope.fee || row.feeLabel === selectedScope.fee)
      && (!selectedScope.installmentKey || installmentKey === selectedScope.installmentKey);
  }), [items, selectedScope]);

  const tabSituations: Array<InstallmentSituation | "action"> = ["action", "overdue", "upcoming", "settled"];
  const activeSituation = tabSituations[activeTab];
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return scopedRows.filter((row) => {
      const inTab = activeSituation === "action" ? row.balanceAmount > 0 : row.situation === activeSituation;
      const matchesPayment = paymentFilter === "all" || paymentState(row) === paymentFilter;
      const searchable = `${row.studentName} ${row.matricule} ${row.levelName} ${row.feeLabel}`.toLocaleLowerCase("fr");
      return inTab && matchesPayment && (!normalized || searchable.includes(normalized));
    });
  }, [activeSituation, paymentFilter, query, scopedRows]);

  const summary = useMemo(() => ({
    expected: scopedRows.reduce((sum, row) => sum + row.amount, 0),
    paid: scopedRows.reduce((sum, row) => sum + row.paidAmount, 0),
    balance: scopedRows.reduce((sum, row) => sum + row.balanceAmount, 0),
    overdue: scopedRows.filter((row) => row.situation === "overdue").reduce((sum, row) => sum + row.balanceAmount, 0),
  }), [scopedRows]);

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <div className="space-y-4 pb-8">
    <PageHeader eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`} title="Échéances et recouvrement" description="Parcourez les frais dans l’arbre, puis travaillez les situations dans la zone centrale." actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />} />
    {failure ? <Message severity="error" text={failure} /> : null}

    <section className="grid min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-slate-50/60 p-3 lg:border-b-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="m-0 text-sm font-semibold text-slate-950">Périmètre</h2><p className="mt-1 text-xs text-slate-500">Cycle → niveau → frais → échéance</p></div><Button icon="pi pi-times" rounded text severity="secondary" aria-label="Tout afficher" onClick={() => setSelectedKey(null)} /></div>
        <Tree value={treeNodes} selectionMode="single" selectionKeys={selectedKey ?? undefined} expandedKeys={expandedKeys} onToggle={(event) => setExpandedKeys(event.value as Record<string, boolean>)} onSelectionChange={(event) => setSelectedKey(typeof event.value === "string" ? event.value : null)} className="border-0 bg-transparent p-0 text-sm" />
      </aside>

      <div className="min-w-0 p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Attendu" value={money(summary.expected)} /><SummaryCard label="Encaissé" value={money(summary.paid)} detail={`${rate(summary.paid, summary.expected)} %`} /><SummaryCard label="Reste" value={money(summary.balance)} /><SummaryCard label="En retard" value={money(summary.overdue)} /></div>

        <TabView activeIndex={activeTab} onTabChange={(event) => { setActiveTab(event.index); setPaymentFilter("all"); }}>
          <TabPanel header="À traiter" /><TabPanel header="En retard" /><TabPanel header="À venir" /><TabPanel header="Soldées" />
        </TabView>

        <div className="mb-3 overflow-x-auto"><div className="flex min-w-max items-end gap-2">
          <label className="w-[320px]"><span className="mb-1 block text-xs font-semibold text-slate-600">Recherche</span><span className="p-input-icon-left block"><i className="pi pi-search" /><InputText value={query} className="h-11 w-full rounded-xl pl-9" placeholder="Élève ou matricule" onChange={(event) => setQuery(event.target.value)} /></span></label>
          <Dropdown value={paymentFilter} className="h-11 w-48" options={[{ label: "Tous les paiements", value: "all" }, { label: "Payés", value: "paid" }, { label: "Partiels", value: "partial" }, { label: "Non payés", value: "unpaid" }]} onChange={(event) => setPaymentFilter(event.value)} />
          {selectedKey ? <Button label="Réinitialiser le périmètre" icon="pi pi-filter-slash" severity="secondary" text onClick={() => setSelectedKey(null)} /> : null}
        </div></div>

        <DataTable value={filteredRows} dataKey="id" paginator rows={20} rowsPerPageOptions={[20, 50, 100]} loading={loading} emptyMessage="Aucune échéance dans cette vue." stripedRows tableStyle={{ minWidth: "1050px" }}>
          <Column header="Élève" body={(row: FinancialInstallmentRow) => <div><strong className="text-slate-950">{row.studentName}</strong><span className="mt-1 block text-xs text-slate-500">{row.matricule} · {row.levelName}</span></div>} />
          <Column header="Frais / échéance" body={(row: FinancialInstallmentRow) => <div><strong>{row.feeLabel}</strong><span className="mt-1 block text-xs text-slate-500">{row.installmentLabel} · {date(row.dueDate)}</span></div>} />
          <Column header="Progression" body={(row: FinancialInstallmentRow) => <div className="min-w-40"><div className="mb-1 flex justify-between text-xs"><span>{money(row.paidAmount)}</span><strong>{rate(row.paidAmount, row.amount)} %</strong></div><ProgressBar value={rate(row.paidAmount, row.amount)} showValue={false} style={{ height: "0.45rem" }} /></div>} />
          <Column header="Restant" body={(row: FinancialInstallmentRow) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{money(row.balanceAmount)}</strong>} />
          <Column header="Situation" body={(row: FinancialInstallmentRow) => <div><Tag value={situationLabels[row.situation]} severity={row.situation === "overdue" ? "danger" : row.situation === "settled" ? "success" : "info"} />{row.daysLate > 0 ? <span className="mt-1 block text-xs text-red-600">{row.daysLate} jour(s) de retard</span> : null}</div>} />
          <Column header="Action" body={(row: FinancialInstallmentRow) => <div className="flex gap-1"><Button label="Dossier" icon="pi pi-folder-open" text onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}`)} /><Button label="Encaisser" icon="pi pi-wallet" size="small" disabled={row.balanceAmount <= 0} onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}/encaissement`)} /></div>} />
        </DataTable>
      </div>
    </section>
  </div>;
}

export function FinancialFamiliesPage() {
  return <Message severity="info" text="Le regroupement des fratries est disponible depuis les dossiers financiers." />;
}
