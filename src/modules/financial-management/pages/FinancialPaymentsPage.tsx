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
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
})[character] ?? character);

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
      const searchable = `${payment.studentName} ${payment.matricule} ${payment.levelName} ${payment.cycleName} ${payment.receiptNumber} ${payment.externalReference ?? ""}`.toLocaleLowerCase("fr");
      return (
        (!normalized || searchable.includes(normalized)) &&
        (!status || payment.status === status) &&
        (!method || payment.method === method) &&
        (!dateFrom || payment.paymentDate >= dateFrom) &&
        (!dateTo || payment.paymentDate <= dateTo)
      );
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

  const printReceipt = () => {
    if (!receiptPayment || !year) return;
    const printWindow = window.open("", "_blank", "width=760,height=900");
    if (!printWindow) {
      notify({ severity: "warn", summary: "Impression bloquée", detail: "Autorisez les fenêtres contextuelles pour imprimer le reçu." });
      return;
    }

    const statusLabel = financialPaymentStatusLabels[receiptPayment.status];
    const rows = [
      ["Élève", receiptPayment.studentName],
      ["Matricule", receiptPayment.matricule],
      ["Cycle", receiptPayment.cycleName || "Non renseigné"],
      ["Niveau", receiptPayment.levelName || "Non renseigné"],
      ["Objet du paiement", "Versement sur le dossier financier"],
      ["Date de paiement", formatDate(receiptPayment.paymentDate)],
      ["Mode de paiement", paymentMethodLabels[receiptPayment.method]],
      ["Référence externe", receiptPayment.externalReference || "Non renseignée"],
    ];
    const tableRows = rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
    const cancellation = receiptPayment.cancellationReason
      ? `<div class="warning"><strong>Encaissement annulé</strong><span>${escapeHtml(receiptPayment.cancellationReason)}</span></div>`
      : "";

    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${escapeHtml(receiptPayment.receiptNumber)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#172033;font-family:Inter,Arial,sans-serif}.page{width:720px;margin:24px auto;background:#fff;border:1px solid #dfe4ea;border-radius:16px;overflow:hidden}.header{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px;border-bottom:1px solid #e5e9ee}.brand{font-size:22px;font-weight:800}.subtitle{margin-top:4px;color:#667085;font-size:12px}.receipt-id{text-align:right}.receipt-id span{display:block;color:#667085;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.receipt-id strong{display:block;margin-top:5px;font-family:monospace;font-size:16px}.status{display:inline-block;margin-top:9px;padding:5px 9px;border-radius:999px;background:#ecfdf3;color:#027a48;font-size:11px;font-weight:700}.content{padding:28px 32px}.amount{padding:22px;border-radius:14px;background:#f0fdf8;border:1px solid #b7ead8}.amount span{display:block;color:#47645c;font-size:12px}.amount strong{display:block;margin-top:6px;color:#065f46;font-size:30px}.details{width:100%;margin-top:20px;border-collapse:collapse;border:1px solid #e5e9ee}.details th,.details td{padding:12px 14px;border-bottom:1px solid #e5e9ee;text-align:left;font-size:13px}.details tr:last-child th,.details tr:last-child td{border-bottom:0}.details th{width:38%;background:#f8fafc;color:#667085;font-weight:600}.details td{color:#172033;font-weight:600}.warning{display:flex;flex-direction:column;gap:5px;margin-top:18px;padding:14px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;color:#9a3412;font-size:12px}.footer{display:flex;justify-content:space-between;gap:24px;padding:20px 32px;border-top:1px solid #e5e9ee;color:#667085;font-size:11px;line-height:1.6}@media print{body{background:#fff}.page{width:100%;margin:0;border:0;border-radius:0}}
    </style></head><body><main class="page"><header class="header"><div><div class="brand">GeeCole</div><div class="subtitle">Reçu officiel d’encaissement · ${escapeHtml(year.name)}</div></div><div class="receipt-id"><span>Numéro du reçu</span><strong>${escapeHtml(receiptPayment.receiptNumber)}</strong><div class="status">${escapeHtml(statusLabel)}</div></div></header><section class="content"><div class="amount"><span>Montant reçu</span><strong>${escapeHtml(formatAmount(receiptPayment.amount))}</strong></div><table class="details"><tbody>${tableRows}</tbody></table>${cancellation}</section><footer class="footer"><span>Ce reçu atteste de l’enregistrement de l’encaissement dans GeeCole.</span><span>Imprimé le ${escapeHtml(new Date().toLocaleString("fr-FR"))}</span></footer></main><script>window.addEventListener('load',()=>{window.print();window.onafterprint=()=>window.close();});</script></body></html>`);
    printWindow.document.close();
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

  const receiptRows = receiptPayment ? [
    ["Élève", receiptPayment.studentName],
    ["Matricule", receiptPayment.matricule],
    ["Cycle", receiptPayment.cycleName || "Non renseigné"],
    ["Niveau", receiptPayment.levelName || "Non renseigné"],
    ["Objet du paiement", "Versement sur le dossier financier"],
    ["Date de paiement", formatDate(receiptPayment.paymentDate)],
    ["Mode de paiement", paymentMethodLabels[receiptPayment.method]],
    ["Référence externe", receiptPayment.externalReference || "Non renseignée"],
  ] : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historique des encaissements"
        description={`Journal de caisse, reçus et annulations pour ${year.name}. Les nouveaux paiements se font depuis les dossiers financiers.`}
        meta={<span className="text-sm text-slate-500">{filteredPayments.length} opération{filteredPayments.length > 1 ? "s" : ""} affichée{filteredPayments.length > 1 ? "s" : ""}</span>}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Statistiques des encaissements</h2>
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
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span><span className="p-input-icon-left block w-full"><i className="pi pi-search left-3 text-sm text-slate-400" /><InputText value={search} className={`${controlClass} pl-9`} placeholder="Élève, matricule, cycle, niveau, reçu ou référence" onChange={(event) => setSearch(event.target.value)} /></span></label>
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

      <Dialog header="Reçu d’encaissement" visible={Boolean(receiptPayment)} modal className="w-[min(96vw,42rem)]" onHide={() => setReceiptPayment(undefined)}>
        {receiptPayment ? (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2 text-lg font-bold text-slate-950"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><i className="pi pi-receipt text-sm" /></span>GeeCole</div>
                  <p className="mt-1 text-xs text-slate-500">Reçu officiel d’encaissement · {year.name}</p>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Numéro du reçu</span>
                  <strong className="mt-1 block font-mono text-sm text-slate-900">{receiptPayment.receiptNumber}</strong>
                  <Tag className="mt-2" value={financialPaymentStatusLabels[receiptPayment.status]} severity={receiptPayment.status === "posted" ? "success" : "danger"} />
                </div>
              </header>

              <div className="p-5">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                  <span className="text-xs font-medium text-emerald-700">Montant reçu</span>
                  <strong className="mt-1 block text-3xl font-bold tracking-tight text-emerald-950">{formatAmount(receiptPayment.amount)}</strong>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {receiptRows.map(([label, value]) => (
                        <tr key={label} className="border-b border-slate-200 last:border-b-0">
                          <th className="w-[38%] bg-slate-50 px-4 py-3 text-left font-semibold text-slate-500">{label}</th>
                          <td className="px-4 py-3 font-semibold text-slate-900">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {receiptPayment.cancellationReason ? <Message className="mt-4 w-full" severity="warn" text={`Motif d’annulation : ${receiptPayment.cancellationReason}`} /> : null}
              </div>

              <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">Ce reçu atteste de l’enregistrement de l’encaissement dans GeeCole.</footer>
            </section>

            <div className="flex justify-end gap-2">
              <Button label="Fermer" severity="secondary" outlined onClick={() => setReceiptPayment(undefined)} />
              <Button label="Imprimer" icon="pi pi-print" onClick={printReceipt} />
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog header="Annuler l’encaissement" visible={Boolean(paymentToCancel)} modal className="w-[min(94vw,32rem)]" onHide={() => { setPaymentToCancel(undefined); setCancellationReason(""); }}>
        <div className="space-y-4"><Message severity="warn" text="L’annulation restaure le solde du dossier et les échéances concernées. L’opération restera visible dans l’historique." /><div className="field"><label htmlFor="cancellation-reason">Motif obligatoire</label><InputTextarea id="cancellation-reason" value={cancellationReason} className="w-full" rows={3} onChange={(event) => setCancellationReason(event.target.value)} /></div><div className="flex justify-end gap-2"><Button label="Fermer" severity="secondary" outlined onClick={() => setPaymentToCancel(undefined)} /><Button label="Confirmer l’annulation" icon="pi pi-ban" severity="danger" loading={saving} disabled={!cancellationReason.trim()} onClick={() => void handleCancel()} /></div></div>
      </Dialog>
    </div>
  );
}
