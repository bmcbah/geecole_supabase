import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialPaymentStatusLabels,
  paymentMethodLabels,
  type FinancialPayment,
  type PaymentMethod,
} from "../domain/financial-payment";
import {
  cancelFinancialPayment,
  listFinancialPayments,
} from "../services/financial-payments.service";

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
  const [method, setMethod] = useState<PaymentMethod | undefined>();
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
      const matchesSearch = !normalized || `${payment.studentName} ${payment.matricule} ${payment.receiptNumber} ${payment.externalReference ?? ""}`.toLocaleLowerCase("fr").includes(normalized);
      const matchesStatus = !status || payment.status === status;
      const matchesMethod = !method || payment.method === method;
      const matchesFrom = !dateFrom || payment.paymentDate >= dateFrom;
      const matchesTo = !dateTo || payment.paymentDate <= dateTo;
      return matchesSearch && matchesStatus && matchesMethod && matchesFrom && matchesTo;
    });
  }, [payments, search, status, method, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const posted = payments.filter((payment) => payment.status === "posted");
    const cancelled = payments.filter((payment) => payment.status === "cancelled");
    const collected = posted.reduce((sum, payment) => sum + payment.amount, 0);
    const cancelledAmount = cancelled.reduce((sum, payment) => sum + payment.amount, 0);
    return {
      operations: payments.length,
      posted: posted.length,
      cancelled: cancelled.length,
      collected,
      cancelledAmount,
      average: posted.length ? collected / posted.length : 0,
    };
  }, [payments]);

  const activeFilterCount = [search, status, method, dateFrom, dateTo].filter(Boolean).length;
  const resetFilters = () => {
    setSearch("");
    setStatus(undefined);
    setMethod(undefined);
    setDateFrom("");
    setDateTo("");
  };

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
    <div className="space-y-4">
      <PageHeader
        title="Historique des encaissements"
        description={`Journal de caisse, reçus et annulations pour ${year.name}. Les nouveaux paiements se font depuis les dossiers financiers.`}
        meta={<span className="text-sm text-slate-500">{filteredPayments.length} opération{filteredPayments.length > 1 ? "s" : ""} affichée{filteredPayments.length > 1 ? "s" : ""}</span>}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">Vue financière</p><h2 className="mt-1 text-base font-semibold text-slate-950">Statistiques des encaissements</h2></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{year.name}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</span><span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200"><i className={`pi ${card.icon} text-sm`} /></span></div>
              <strong className="mt-4 block text-xl font-bold tracking-tight text-slate-950">{card.value}</strong>
              <span className="mt-1 block text-xs text-slate-500">{card.hint}</span>
            </article>
          ))}
        </div>
      </section>

      {error ? <Message severity="error" text={error} /> : null}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px]">
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span><span className="p-input-icon-left block w-full"><i className="pi pi-search left-3 text-sm text-slate-400" /><InputText value={search} className={`${controlClass} pl-9`} placeholder="Élève, matricule, reçu ou référence" onChange={(event) => setSearch(event.target.value)} /></span></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Statut</span><Dropdown value={status} className={controlClass} showClear placeholder="Tous les statuts" options={Object.entries(financialPaymentStatusLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setStatus(event.value)} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mode de paiement</span><Dropdown value={method} className={controlClass} showClear placeholder="Tous les modes" options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setMethod(event.value)} /></label>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {activeFilterCount > 0 ? <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" text onClick={resetFilters} /> : null}
            <Button label={advanced ? "Masquer" : "Plus de filtres"} icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"} severity="secondary" outlined onClick={() => setAdvanced((value) => !value)} />
          </div>
        </div>
        {advanced ? <div className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/35 p-4 md:grid-cols-2"><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Du</span><InputText type="date" className={controlClass} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Au</span><InputText type="date" className={controlClass} value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label></div> : null}
      </section>

      <SettingsTablePanel dataTable={filteredPayments.length === 0 && !loading ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200"><i className="pi pi-receipt" /></span><h3 className="mt-4 text-sm font-semibold text-slate-900">Aucun encaissement trouvé</h3><p className="mt-1 text-sm text-slate-500">Modifiez les filtres pour afficher d’autres opérations.</p></div></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><DataTable value={filteredPayments} loading={loading} dataKey="id" paginator={filteredPayments.length > 10} rows={10} rowsPerPageOptions={[10, 25, 50]} stripedRows className="text-sm" tableStyle={{ minWidth: "1050px" }}>
          <Column field="receiptNumber" header="Reçu" sortable body={(payment: FinancialPayment) => <span className="font-mono text-xs font-semibold text-slate-700">{payment.receiptNumber}</span>} />
          <Column field="studentName" header="Élève" sortable body={(payment: FinancialPayment) => <div><strong className="block text-sm text-slate-900">{payment.studentName}</strong><span className="text-xs text-slate-400">{payment.matricule}</span></div>} />
          <Column header="Date" body={(payment: FinancialPayment) => formatDate(payment.paymentDate)} sortField="paymentDate" sortable />
          <Column header="Montant" body={(payment: FinancialPayment) => <strong className="text-slate-950">{formatAmount(payment.amount)}</strong>} sortField="amount" sortable />
          <Column header="Mode" body={(payment: FinancialPayment) => paymentMethodLabels[payment.method]} sortField="method" sortable />
          <Column header="Référence" body={(payment: FinancialPayment) => <span className="text-slate-600">{payment.externalReference || "—"}</span>} />
          <Column header="Statut" body={(payment: FinancialPayment) => <Tag value={financialPaymentStatusLabels[payment.status]} severity={payment.status === "posted" ? "success" : "danger"} />} sortField="status" sortable />
          <Column header="" body={(payment: FinancialPayment) => <div className="flex justify-end gap-1"><Button icon="pi pi-eye" text rounded aria-label="Voir le reçu" onClick={() => setReceiptPayment(payment)} /><Button icon="pi pi-ban" text rounded severity="danger" aria-label="Annuler" disabled={payment.status === "cancelled"} onClick={() => setPaymentToCancel(payment)} /></div>} />
        </DataTable></div>
      )} />

      <Dialog header="Reçu d’encaissement" visible={Boolean(receiptPayment)} modal className="w-[min(94vw,34rem)]" onHide={() => setReceiptPayment(undefined)}>
        {receiptPayment ? <div className="space-y-4"><div className="rounded-lg border border-slate-200 p-4"><div className="mb-4 flex items-start justify-between gap-4"><div><div className="text-sm text-slate-500">Reçu</div><div className="text-lg font-semibold">{receiptPayment.receiptNumber}</div></div><Tag value={financialPaymentStatusLabels[receiptPayment.status]} severity={receiptPayment.status === "posted" ? "success" : "danger"} /></div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Élève</dt><dd className="font-medium">{receiptPayment.studentName}</dd></div><div><dt className="text-slate-500">Matricule</dt><dd className="font-medium">{receiptPayment.matricule}</dd></div><div><dt className="text-slate-500">Date</dt><dd className="font-medium">{formatDate(receiptPayment.paymentDate)}</dd></div><div><dt className="text-slate-500">Mode</dt><dd className="font-medium">{paymentMethodLabels[receiptPayment.method]}</dd></div><div className="col-span-2"><dt className="text-slate-500">Montant</dt><dd className="text-xl font-semibold">{formatAmount(receiptPayment.amount)}</dd></div></dl></div>{receiptPayment.cancellationReason ? <Message severity="warn" text={`Motif d’annulation : ${receiptPayment.cancellationReason}`} /> : null}</div> : null}
      </Dialog>

      <Dialog header="Annuler l’encaissement" visible={Boolean(paymentToCancel)} modal className="w-[min(94vw,32rem)]" onHide={() => { setPaymentToCancel(undefined); setCancellationReason(""); }}>
        <div className="space-y-4"><Message severity="warn" text="L’annulation restaure le solde du dossier et les échéances concernées. L’opération restera visible dans l’historique." /><div className="field"><label htmlFor="cancellation-reason">Motif obligatoire</label><InputTextarea id="cancellation-reason" value={cancellationReason} className="w-full" rows={3} onChange={(event) => setCancellationReason(event.target.value)} /></div><div className="flex justify-end gap-2"><Button label="Fermer" severity="secondary" outlined onClick={() => setPaymentToCancel(undefined)} /><Button label="Confirmer l’annulation" icon="pi pi-ban" severity="danger" loading={saving} disabled={!cancellationReason.trim()} onClick={() => void handleCancel()} /></div></div>
      </Dialog>
    </div>
  );
}
