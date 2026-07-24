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
  listFinancialInstallments,
  type FinancialInstallmentRow,
  type InstallmentSituation,
} from "../services/financial-pilotage.service";

export { FinancialDashboardPage } from "./FinancialDashboardPage";

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} GNF`;
const date = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR") : "—";
const rate = (paid: number, total: number) => total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
const labels: Record<InstallmentSituation, string> = { upcoming: "À venir", due: "À échéance", overdue: "En retard", settled: "Soldée" };

function paymentState(row: FinancialInstallmentRow) {
  if (row.balanceAmount <= 0) return "paid" as const;
  if (row.paidAmount > 0) return "partial" as const;
  return "unpaid" as const;
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail?: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const accent = tone === "success" ? "border-emerald-200 bg-emerald-50/60" : tone === "warning" ? "border-amber-200 bg-amber-50/60" : tone === "danger" ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white";
  return <article className={`flex min-h-[108px] flex-col justify-between rounded-xl border p-4 ${accent}`}><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span><div><strong className="block text-xl font-bold text-slate-950">{value}</strong>{detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}</div></article>;
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

  const scopeLabel = selectedScope.installmentKey ? "Échéance sélectionnée" : selectedScope.fee ? selectedScope.fee : selectedScope.level ? selectedScope.level : selectedScope.cycle ? selectedScope.cycle : "Tout l’établissement";

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <div className="space-y-4 pb-8">
    <PageHeader eyebrow={`Gestion financière · ${year?.name ?? "Année scolaire"}`} title="Échéances et recouvrement" description="Sélectionnez un périmètre à gauche, puis traitez les dossiers dans la même zone de travail." actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />} />
    {failure ? <Message severity="error" text={failure} /> : null}

    <section className="grid min-h-[720px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex min-h-0 min-w-0 flex-col border-b border-slate-200 bg-slate-50/70 xl:border-b-0 xl:border-r">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-4"><div><h2 className="m-0 text-base font-semibold text-slate-950">Périmètre de travail</h2><p className="mt-1 text-xs text-slate-500">Cycle → niveau → frais → échéance</p></div><Button icon="pi pi-filter-slash" rounded text severity="secondary" aria-label="Tout afficher" onClick={() => setSelectedKey(null)} /></div>
        <div className="border-b border-slate-200 p-3"><span className="p-input-icon-left block"><i className="pi pi-search" /><InputText className="h-10 w-full rounded-lg pl-9" placeholder="Rechercher dans l’arbre" /></span></div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <Tree value={treeNodes} selectionMode="single" selectionKeys={selectedKey ?? undefined} expandedKeys={expandedKeys} onToggle={(event) => setExpandedKeys(event.value as Record<string, boolean>)} onSelectionChange={(event) => setSelectedKey(typeof event.value === "string" ? event.value : null)} className="min-w-[310px] border-0 bg-transparent p-0 text-sm" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="shrink-0 border-b border-slate-200 px-5 py-4"><div className="mb-3 flex items-center justify-between gap-3"><div><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Périmètre actif</span><h2 className="m-0 mt-1 text-base font-semibold text-slate-950">{scopeLabel}</h2></div>{selectedKey ? <Button label="Tout afficher" icon="pi pi-times" severity="secondary" text onClick={() => setSelectedKey(null)} /> : null}</div><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"><Metric label="Attendu" value={money(summary.expected)} /><Metric label="Encaissé" value={money(summary.paid)} detail={`${rate(summary.paid, summary.expected)} %`} tone="success" /><Metric label="Reste" value={money(summary.balance)} tone="warning" /><Metric label="En retard" value={money(summary.overdue)} tone="danger" /></div></div>

        <div className="shrink-0 border-b border-slate-200 px-5 pt-2"><TabView activeIndex={activeTab} onTabChange={(event) => { setActiveTab(event.index); setPaymentFilter("all"); }}><TabPanel header="À traiter" /><TabPanel header="En retard" /><TabPanel header="À venir" /><TabPanel header="Soldées" /></TabView></div>

        <div className="shrink-0 border-b border-slate-200 p-4"><div className="flex flex-wrap items-end gap-2"><label className="min-w-[260px] flex-1"><span className="mb-1 block text-xs font-semibold text-slate-600">Recherche</span><span className="p-input-icon-left block"><i className="pi pi-search" /><InputText value={query} className="h-10 w-full rounded-lg pl-9" placeholder="Élève ou matricule" onChange={(event) => setQuery(event.target.value)} /></span></label><Dropdown value={paymentFilter} className="h-10 w-52" options={[{ label: "Tous les paiements", value: "all" }, { label: "Payés", value: "paid" }, { label: "Partiels", value: "partial" }, { label: "Non payés", value: "unpaid" }]} onChange={(event) => setPaymentFilter(event.value)} /></div></div>

        <div className="min-h-0 flex-1 overflow-hidden">
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
  </div>;
}

export function FinancialFamiliesPage() {
  return <Message severity="info" text="Le regroupement des fratries est disponible depuis les dossiers financiers." />;
}
