import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { financialPaymentStatusLabels, paymentMethodLabels, type FinancialPayment, type PaymentMethod } from "../domain/financial-payment";
import { cancelFinancialPayment, listFinancialPayments } from "../services/financial-payments.service";

const formatAmount = (value: number) => `${Number(value).toLocaleString("fr-GN")} GNF`;
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
const controlClass = "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export function FinancialPaymentsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [payments, setPayments] = useState<FinancialPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<FinancialPayment>();
  const [paymentToCancel, setPaymentToCancel] = useState<FinancialPayment>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();
  const [method, setMethod] = useState<PaymentMethod>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError(undefined);
    try {
      setPayments(await listFinancialPayments(institutionId, year.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger l’historique des encaissements.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, year]);

  useEffect(() => { void load(); }, [load]);

  const filteredPayments = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("fr");
    return payments.filter((payment) => {
      const searchable = `${payment.studentName} ${payment.matricule} ${payment.levelName} ${payment.cycleName} ${payment.receiptNumber} ${payment.externalReference ?? ""}`.toLocaleLowerCase("fr");
      return (!normalized || searchable.includes(normalized)) && (!status || payment.status === status) && (!method || payment.method === method) && (!dateFrom || payment.paymentDate >= dateFrom) && (!dateTo || payment.paymentDate <= dateTo);
    });
  }, [payments, search, status, method, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const posted = payments.filter((payment) => payment.status === "posted");
    const cancelled = payments.filter((payment) => payment.status === "cancelled");
    const collected = posted.reduce((sum, payment) => sum + payment.amount, 0);
    const cancelledAmount = cancelled.reduce((sum, payment) => sum + payment.amount, 0);
    return { operations: payments.length, posted: posted.length, cancelled: cancelled.length, collected, cancelledAmount, average: posted.length ? collected / posted.length : 0 };
  }, [payments]);

  const activeFilterCount = [search, status, method, dateFrom, dateTo].filter(Boolean).length;
  const resetFilters = () => { setSearch(""); setStatus(undefined); setMethod(undefined); setDateFrom(""); setDateTo(""); };

  const handleCancel = async () => {
    if (!paymentToCancel || !cancellationReason.trim()) return;
    setSaving(true);
    try {
      await cancelFinancialPayment(paymentToCancel.id, cancellationReason.trim());
      setPaymentToCancel(undefined);
      setCancellationReason("");
      await load();
      notify({ severity: "success", summary: "Encaissement annulé" });
    } catch (cause) {
      notify({ severity: "error", summary: "Annulation impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire pour consulter les encaissements." />;

  const statCards = [
    { label: "Montant encaissé", value: formatAmount(stats.collected), hint: `${stats.posted} encaissement${stats.posted > 1 ? "s" : ""}`, icon: "pi-wallet" },
    { label: "Panier moyen", value: formatAmount(stats.average), hint: "Par encaissement comptabilisé", icon: "pi-chart-line" },
    { label: "Opérations", value: String(stats.operations), hint: `${stats.cancelled} annulée${stats.cancelled > 1 ? "s" : ""}`, icon: "pi-list" },
    { label: "Montant annulé", value: formatAmount(stats.cancelledAmount), hint: "Conservé dans l’historique", icon: "pi-ban" },
  ];

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title="Historique des encaissements" description={`Journal de caisse, reçus et annulations pour ${year.name}.`} meta={<div className="flex items-center gap-2 text-sm text-slate-500"><MetricIcon icon="pi-receipt" /><strong className="font-semibold text-slate-900">{filteredPayments.length}</strong><span>opération{filteredPayments.length > 1 ? "s" : ""}</span></div>} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-950">Vue de caisse</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{year.name}</span></div>
        <div className="grid ps-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">{statCards.map((card) => <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</span><MetricIcon icon={card.icon} /></div><strong className="mt-4 block text-xl font-bold tracking-tight text-slate-950">{card.value}</strong><span className="mt-1 block text-xs text-slate-500">{card.hint}</span></article>)}</div>
      </section>

      {error ? <Message severity="error" text={error} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-end"><div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px]"><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span><span className="p-input-icon-left block w-full"><i className="pi pi-search left-3 text-sm text-slate-400" /><InputText value={search} className={`${controlClass} pl-9`} placeholder="Élève, matricule, cycle, niveau, reçu ou référence" onChange={(event) => setSearch(event.target.value)} /></span></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Statut</span><Dropdown value={status} className={controlClass} showClear placeholder="Tous les statuts" options={Object.entries(financialPaymentStatusLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setStatus(event.value)} /></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mode de paiement</span><Dropdown value={method} className={controlClass} showClear placeholder="Tous les modes" options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setMethod(event.value)} /></label></div><div className="ml-auto flex flex-wrap items-center justify-end gap-2">{activeFilterCount > 0 ? <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" text onClick={resetFilters} /> : null}<Button label={advanced ? "Masquer" : "Plus de filtres"} icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"} severity="secondary" outlined badge={activeFilterCount > 0 ? String(activeFilterCount) : undefined} onClick={() => setAdvanced((value) => !value)} /></div></div></div>
        {advanced ? <div className="border-t border-emerald-100 bg-emerald-50/35 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Filtres avancés</h3><p className="mt-0.5 text-xs text-slate-500">Limitez l’historique à une période précise.</p></div><MetricIcon icon="pi-sliders-h" /></div><div className="grid gap-3 md:grid-cols-2"><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Du</span><InputText type="date" className={controlClass} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Au</span><InputText type="date" className={controlClass} value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label></div></div> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="grid min-h-[360px] place-items-center"><div className="text-center"><ProgressSpinner className="size-10" strokeWidth="4" /><p className="mt-3 text-sm font-medium text-slate-500">Chargement de l’historique…</p></div></div> : filteredPayments.length === 0 ? <div className="grid min-h-[360px] place-items-center p-8 text-center"><div><MetricIcon icon="pi-receipt" size="md" tone="slate" className="mx-auto" /><h3 className="mt-4 text-sm font-semibold text-slate-900">Aucun encaissement trouvé</h3><p className="mt-1 text-sm text-slate-500">Modifiez les filtres pour afficher d’autres opérations.</p></div></div> : <DataTable value={filteredPayments} dataKey="id" paginator={filteredPayments.length > 10} rows={10} rowsPerPageOptions={[10, 25, 50]} stripedRows className="text-sm" tableStyle={{ minWidth: "1050px" }}><Column field="receiptNumber" header="Reçu" sortable body={(payment: FinancialPayment) => <span className="font-mono text-xs font-semibold text-slate-700">{payment.receiptNumber}</span>} /><Column field="studentName" header="Élève" sortable body={(payment: FinancialPayment) => <div><strong className="block text-sm text-slate-900">{payment.studentName}</strong><span className="text-xs text-slate-400">{payment.matricule} · {payment.levelName}</span></div>} /><Column header="Date" body={(payment: FinancialPayment) => formatDate(payment.paymentDate)} sortField="paymentDate" sortable /><Column header="Montant" body={(payment: FinancialPayment) => <strong className="text-slate-950">{formatAmount(payment.amount)}</strong>} sortField="amount" sortable /><Column header="Mode" body={(payment: FinancialPayment) => paymentMethodLabels[payment.method]} sortField="method" sortable /><Column header="Référence" body={(payment: FinancialPayment) => <span className="text-slate-600">{payment.externalReference || "—"}</span>} /><Column header="Statut" body={(payment: FinancialPayment) => <Tag value={financialPaymentStatusLabels[payment.status]} severity={payment.status === "posted" ? "success" : "danger"} />} sortField="status" sortable /><Column header="" body={(payment: FinancialPayment) => <div className="flex justify-end gap-1"><Button icon="pi pi-eye" text rounded aria-label="Voir le reçu" onClick={() => setReceiptPayment(payment)} /><Button icon="pi pi-ban" text rounded severity="danger" aria-label="Annuler" disabled={payment.status === "cancelled"} onClick={() => setPaymentToCancel(payment)} /></div>} /></DataTable>}
      </section>

      <Dialog header="Reçu d’encaissement" visible={Boolean(receiptPayment)} modal className="w-[min(96vw,42rem)]" onHide={() => setReceiptPayment(undefined)}>{receiptPayment ? <div className="space-y-4"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div><div className="flex items-center gap-2 text-lg font-bold text-slate-950"><MetricIcon icon="pi-receipt" />GeeCole</div><p className="mt-1 text-xs text-slate-500">Reçu officiel d’encaissement · {year.name}</p></div><div className="text-right"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Numéro du reçu</span><strong className="mt-1 block font-mono text-sm text-slate-900">{receiptPayment.receiptNumber}</strong><Tag className="mt-2" value={financialPaymentStatusLabels[receiptPayment.status]} severity={receiptPayment.status === "posted" ? "success" : "danger"} /></div></header><div className="p-5"><div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5"><span className="text-xs font-medium text-emerald-700">Montant reçu</span><strong className="mt-1 block text-3xl font-bold tracking-tight text-emerald-950">{formatAmount(receiptPayment.amount)}</strong></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Élève", receiptPayment.studentName], ["Matricule", receiptPayment.matricule], ["Cycle", receiptPayment.cycleName || "—"], ["Niveau", receiptPayment.levelName || "—"], ["Date", formatDate(receiptPayment.paymentDate)], ["Mode", paymentMethodLabels[receiptPayment.method]], ["Référence", receiptPayment.externalReference || "—"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>)}</div>{receiptPayment.cancellationReason ? <Message className="mt-4 w-full" severity="warn" text={`Motif d’annulation : ${receiptPayment.cancellationReason}`} /> : null}</div></section><div className="flex justify-end gap-2"><Button label="Fermer" severity="secondary" outlined onClick={() => setReceiptPayment(undefined)} /><Button label="Imprimer" icon="pi pi-print" onClick={() => window.print()} /></div></div> : null}</Dialog>

      <Dialog header="Annuler l’encaissement" visible={Boolean(paymentToCancel)} modal className="w-[min(94vw,32rem)]" onHide={() => { setPaymentToCancel(undefined); setCancellationReason(""); }}><div className="space-y-4"><Message severity="warn" text="L’annulation restaure le solde du dossier et les échéances concernées. L’opération restera visible dans l’historique." /><div className="field"><label htmlFor="cancellation-reason">Motif obligatoire</label><InputTextarea id="cancellation-reason" value={cancellationReason} className="w-full" rows={3} onChange={(event) => setCancellationReason(event.target.value)} /></div><div className="flex justify-end gap-2"><Button label="Fermer" severity="secondary" outlined onClick={() => setPaymentToCancel(undefined)} /><Button label="Confirmer l’annulation" icon="pi pi-ban" severity="danger" loading={saving} disabled={!cancellationReason.trim()} onClick={() => void handleCancel()} /></div></div></Dialog>
    </div>
  );
}
