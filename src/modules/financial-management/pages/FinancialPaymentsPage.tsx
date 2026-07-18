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
} from "../domain/financial-payment";
import {
  cancelFinancialPayment,
  listFinancialPayments,
} from "../services/financial-payments.service";

const formatAmount = (value: number) => `${Number(value).toLocaleString("fr-GN")} GNF`;
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");

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
      return matchesSearch && matchesStatus;
    });
  }, [payments, search, status]);

  const totalCollected = useMemo(() => payments
    .filter((payment) => payment.status === "posted")
    .reduce((sum, payment) => sum + payment.amount, 0), [payments]);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historique des encaissements"
        description={`Journal de caisse, reçus et annulations pour ${year.name}. Les nouveaux paiements se font depuis les dossiers financiers.`}
        meta={<div className="flex flex-wrap gap-2">
          <Tag value={`${payments.length} opération${payments.length > 1 ? "s" : ""}`} severity="secondary" />
          <Tag value={`Encaissé ${formatAmount(totalCollected)}`} severity="success" />
        </div>}
      />

      {error ? <Message severity="error" text={error} /> : null}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <span className="p-input-icon-left w-full">
          <i className="pi pi-search" />
          <InputText value={search} className="w-full" placeholder="Élève, matricule, reçu ou référence" onChange={(event) => setSearch(event.target.value)} />
        </span>
        <Dropdown value={status} className="w-full" showClear placeholder="Tous les statuts" options={Object.entries(financialPaymentStatusLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setStatus(event.value)} />
        <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" outlined onClick={() => { setSearch(""); setStatus(undefined); }} />
      </div>

      <SettingsTablePanel dataTable={<DataTable value={filteredPayments} loading={loading} dataKey="id" emptyMessage="Aucun encaissement ne correspond aux filtres." paginator={filteredPayments.length > 10} rows={10} rowsPerPageOptions={[10, 25, 50]} stripedRows>
        <Column field="receiptNumber" header="Reçu" sortable />
        <Column field="studentName" header="Élève" sortable />
        <Column field="matricule" header="Matricule" sortable />
        <Column header="Date" body={(payment: FinancialPayment) => formatDate(payment.paymentDate)} sortField="paymentDate" sortable />
        <Column header="Montant" body={(payment: FinancialPayment) => formatAmount(payment.amount)} sortField="amount" sortable />
        <Column header="Mode" body={(payment: FinancialPayment) => paymentMethodLabels[payment.method]} sortField="method" sortable />
        <Column header="Statut" body={(payment: FinancialPayment) => <Tag value={financialPaymentStatusLabels[payment.status]} severity={payment.status === "posted" ? "success" : "danger"} />} sortField="status" sortable />
        <Column header="" body={(payment: FinancialPayment) => <div className="flex justify-end gap-1">
          <Button icon="pi pi-eye" text rounded aria-label="Voir le reçu" onClick={() => setReceiptPayment(payment)} />
          <Button icon="pi pi-ban" text rounded severity="danger" aria-label="Annuler" disabled={payment.status === "cancelled"} onClick={() => setPaymentToCancel(payment)} />
        </div>} />
      </DataTable>} />

      <Dialog header="Reçu d’encaissement" visible={Boolean(receiptPayment)} modal className="w-[min(94vw,34rem)]" onHide={() => setReceiptPayment(undefined)}>
        {receiptPayment ? <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-4 flex items-start justify-between gap-4"><div><div className="text-sm text-slate-500">Reçu</div><div className="text-lg font-semibold">{receiptPayment.receiptNumber}</div></div><Tag value={financialPaymentStatusLabels[receiptPayment.status]} severity={receiptPayment.status === "posted" ? "success" : "danger"} /></div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Élève</dt><dd className="font-medium">{receiptPayment.studentName}</dd></div>
              <div><dt className="text-slate-500">Matricule</dt><dd className="font-medium">{receiptPayment.matricule}</dd></div>
              <div><dt className="text-slate-500">Date</dt><dd className="font-medium">{formatDate(receiptPayment.paymentDate)}</dd></div>
              <div><dt className="text-slate-500">Mode</dt><dd className="font-medium">{paymentMethodLabels[receiptPayment.method]}</dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Montant</dt><dd className="text-xl font-semibold">{formatAmount(receiptPayment.amount)}</dd></div>
            </dl>
          </div>
          {receiptPayment.cancellationReason ? <Message severity="warn" text={`Motif d’annulation : ${receiptPayment.cancellationReason}`} /> : null}
        </div> : null}
      </Dialog>

      <Dialog header="Annuler l’encaissement" visible={Boolean(paymentToCancel)} modal className="w-[min(94vw,32rem)]" onHide={() => { setPaymentToCancel(undefined); setCancellationReason(""); }}>
        <div className="space-y-4">
          <Message severity="warn" text="L’annulation restaure le solde du dossier et les échéances concernées. L’opération restera visible dans l’historique." />
          <div className="field"><label htmlFor="cancellation-reason">Motif obligatoire</label><InputTextarea id="cancellation-reason" value={cancellationReason} className="w-full" rows={3} onChange={(event) => setCancellationReason(event.target.value)} /></div>
          <div className="flex justify-end gap-2"><Button label="Fermer" severity="secondary" outlined onClick={() => setPaymentToCancel(undefined)} /><Button label="Confirmer l’annulation" icon="pi pi-ban" severity="danger" loading={saving} disabled={!cancellationReason.trim()} onClick={() => void handleCancel()} /></div>
        </div>
      </Dialog>
    </div>
  );
}
