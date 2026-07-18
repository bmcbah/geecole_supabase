import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialAccountStatusLabels,
  type FinancialAccount,
  type FinancialAccountDetails,
  type FinancialAccountItem,
  type FinancialAccountStatus,
} from "../domain/financial-account";
import { paymentMethodLabels, type PaymentMethod } from "../domain/financial-payment";
import {
  generateFinancialAccount,
  getFinancialAccount,
  listConfirmedEnrollmentsWithoutFinancialAccount,
  listFinancialAccounts,
} from "../services/financial-accounts.service";
import { registerTargetedFinancialPayment } from "../services/financial-payments.service";

const statusSeverity: Record<FinancialAccountStatus, "secondary" | "info" | "success" | "danger"> = {
  draft: "secondary",
  active: "info",
  settled: "success",
  cancelled: "danger",
};
const formatAmount = (value: number, currency = "GNF") => `${Number(value).toLocaleString("fr-GN")} ${currency}`;
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);
const controlClass = "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export function FinancialAccountsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string>();
  const [paymentAccount, setPaymentAccount] = useState<FinancialAccountDetails>();
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [installmentAmounts, setInstallmentAmounts] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FinancialAccountStatus | undefined>();
  const [level, setLevel] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError(undefined);
    try {
      const [nextAccounts, nextEnrollments] = await Promise.all([
        listFinancialAccounts(institutionId, year.id),
        listConfirmedEnrollmentsWithoutFinancialAccount(institutionId, year.id),
      ]);
      setAccounts(nextAccounts);
      setEnrollments(nextEnrollments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger la gestion financière.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, year]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => accounts.reduce((summary, account) => ({
    total: summary.total + account.totalAmount,
    paid: summary.paid + account.paidAmount,
    balance: summary.balance + account.balanceAmount,
  }), { total: 0, paid: 0, balance: 0 }), [accounts]);

  const stats = useMemo(() => {
    const activeAccounts = accounts.filter((account) => account.status === "active");
    const settledAccounts = accounts.filter((account) => account.status === "settled");
    return {
      active: activeAccounts.length,
      settled: settledAccounts.length,
      collectionRate: totals.total > 0 ? (totals.paid / totals.total) * 100 : 0,
    };
  }, [accounts, totals]);

  const levelOptions = useMemo(() => Array.from(new Set(accounts.map((account) => account.levelName).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")).map((value) => ({ value, label: value })), [accounts]);

  const filteredAccounts = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("fr");
    return accounts.filter((account) => {
      const matchesSearch = !normalized || `${account.studentName} ${account.matricule} ${account.levelName}`.toLocaleLowerCase("fr").includes(normalized);
      const matchesStatus = !status || account.status === status;
      const matchesLevel = !level || account.levelName === level;
      const matchesBalance = !balanceFilter || (balanceFilter === "open" && account.balanceAmount > 0) || (balanceFilter === "settled" && account.balanceAmount <= 0) || (balanceFilter === "unpaid" && account.paidAmount <= 0);
      return matchesSearch && matchesStatus && matchesLevel && matchesBalance;
    });
  }, [accounts, search, status, level, balanceFilter]);

  const activeFilterCount = [search, status, level, balanceFilter].filter(Boolean).length;
  const resetFilters = () => { setSearch(""); setStatus(undefined); setLevel(""); setBalanceFilter(""); };

  const enrollmentOptions = enrollments.map((enrollment) => {
    const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
    return { value: enrollment.id, label: `${student?.first_name ?? ""} ${student?.last_name ?? ""} — ${enrollment.level_name_snapshot}`.trim() };
  });

  const selectedItem = useMemo(() => paymentAccount?.items.find((item) => item.id === selectedItemId), [paymentAccount, selectedItemId]);
  const payableItems = useMemo(() => (paymentAccount?.items ?? []).filter((item) => (item.installments ?? []).some((installment) => installment.balanceAmount > 0)), [paymentAccount]);
  const itemOptions = useMemo(() => payableItems.map((item) => {
    const remaining = (item.installments ?? []).reduce((sum, installment) => sum + installment.balanceAmount, 0);
    return { value: item.id, label: `${item.label} — ${formatAmount(remaining, paymentAccount?.currencyCode)}` };
  }), [payableItems, paymentAccount?.currencyCode]);
  const selectedInstallments = useMemo(() => (selectedItem?.installments ?? []).filter((item) => item.balanceAmount > 0), [selectedItem]);
  const paymentTotal = useMemo(() => selectedInstallments.reduce((sum, installment) => sum + (installmentAmounts[installment.id] ?? 0), 0), [installmentAmounts, selectedInstallments]);

  const handleGenerate = async () => {
    if (!enrollmentId) return;
    setGenerating(true);
    try {
      await generateFinancialAccount(enrollmentId);
      setGenerationDialogOpen(false);
      setEnrollmentId(undefined);
      await load();
      notify({ severity: "success", summary: "Dossier financier généré" });
    } catch (cause) {
      notify({ severity: "error", summary: "Génération impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally { setGenerating(false); }
  };

  const initializeSelectedItem = (item?: FinancialAccountItem) => { setSelectedItemId(item?.id); setInstallmentAmounts({}); };
  const openPayment = async (account: FinancialAccount) => {
    try {
      const details = await getFinancialAccount(account.id);
      setPaymentAccount(details);
      initializeSelectedItem(details.items.find((item) => (item.installments ?? []).some((installment) => installment.balanceAmount > 0)));
      setMethod("cash"); setPaymentDate(new Date()); setReference(""); setNote("");
    } catch (cause) {
      notify({ severity: "error", summary: "Dossier inaccessible", detail: cause instanceof Error ? cause.message : undefined });
    }
  };
  const closePayment = () => { setPaymentAccount(undefined); setSelectedItemId(undefined); setInstallmentAmounts({}); setReference(""); setNote(""); };
  const setInstallmentAmount = (installmentId: string, value: number | null) => setInstallmentAmounts((current) => ({ ...current, [installmentId]: value ?? 0 }));
  const settleSelectedItem = () => setInstallmentAmounts(selectedInstallments.reduce<Record<string, number>>((result, installment) => { result[installment.id] = installment.balanceAmount; return result; }, {}));

  const handlePayment = async () => {
    if (!paymentAccount || !selectedItem || paymentTotal <= 0) return;
    const allocations = selectedInstallments.map((installment) => ({ installmentId: installment.id, amount: installmentAmounts[installment.id] ?? 0 })).filter((allocation) => allocation.amount > 0);
    if (selectedInstallments.some((installment) => (installmentAmounts[installment.id] ?? 0) > installment.balanceAmount)) return;
    setSaving(true);
    try {
      await registerTargetedFinancialPayment({ financialAccountId: paymentAccount.id, allocations, method, paymentDate: toDateInput(paymentDate), externalReference: reference, note });
      closePayment(); await load(); notify({ severity: "success", summary: "Encaissement enregistré" });
    } catch (cause) {
      notify({ severity: "error", summary: "Encaissement impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally { setSaving(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire pour ouvrir la gestion financière." />;

  const statCards = [
    { label: "Montant facturé", value: formatAmount(totals.total), hint: `${accounts.length} dossier${accounts.length > 1 ? "s" : ""}`, icon: "pi-file" },
    { label: "Montant encaissé", value: formatAmount(totals.paid), hint: `${stats.collectionRate.toFixed(1)} % recouvré`, icon: "pi-wallet" },
    { label: "Reste à encaisser", value: formatAmount(totals.balance), hint: `${stats.active} dossier${stats.active > 1 ? "s" : ""} actif${stats.active > 1 ? "s" : ""}`, icon: "pi-clock" },
    { label: "Dossiers soldés", value: String(stats.settled), hint: `${accounts.length ? Math.round((stats.settled / accounts.length) * 100) : 0} % du portefeuille`, icon: "pi-check-circle" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Dossiers financiers" description={`Les frais et leurs plans sont résolus automatiquement selon le niveau, le cycle puis l’établissement pour ${year.name}.`} meta={<span className="text-sm text-slate-500">{filteredAccounts.length} dossier{filteredAccounts.length > 1 ? "s" : ""} affiché{filteredAccounts.length > 1 ? "s" : ""}</span>} actions={<Button label="Générer un dossier" icon="pi pi-plus" className="h-10 rounded-xl" disabled={!enrollments.length} onClick={() => setGenerationDialogOpen(true)} />} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">Vue financière</p><h2 className="mt-1 text-base font-semibold text-slate-950">Statistiques des dossiers</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{year.name}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statCards.map((card) => <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</span><span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200"><i className={`pi ${card.icon} text-sm`} /></span></div><strong className="mt-4 block text-xl font-bold tracking-tight text-slate-950">{card.value}</strong><span className="mt-1 block text-xs text-slate-500">{card.hint}</span></article>)}</div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end"><div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px]"><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span><span className="p-input-icon-left block w-full"><i className="pi pi-search left-3 text-sm text-slate-400" /><InputText className={`${controlClass} pl-9`} value={search} placeholder="Élève, matricule ou niveau" onChange={(event) => setSearch(event.target.value)} /></span></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Statut</span><Dropdown className={controlClass} value={status} showClear placeholder="Tous les statuts" options={Object.entries(financialAccountStatusLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setStatus(event.value)} /></label><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Niveau</span><Dropdown className={controlClass} value={level} showClear filter placeholder="Tous les niveaux" options={levelOptions} onChange={(event) => setLevel(event.value ?? "")} /></label></div><div className="ml-auto flex flex-wrap items-center justify-end gap-2">{activeFilterCount > 0 ? <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" text onClick={resetFilters} /> : null}<Button label={advanced ? "Masquer" : "Plus de filtres"} icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"} severity="secondary" outlined onClick={() => setAdvanced((value) => !value)} /></div></div>
        {advanced ? <div className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/35 p-4 md:grid-cols-2 xl:grid-cols-3"><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Situation de paiement</span><Dropdown className={controlClass} value={balanceFilter} showClear placeholder="Toutes les situations" options={[{ label: "Solde ouvert", value: "open" }, { label: "Dossier soldé", value: "settled" }, { label: "Aucun paiement", value: "unpaid" }]} onChange={(event) => setBalanceFilter(event.value ?? "")} /></label></div> : null}
      </section>

      <SettingsTablePanel alert={error ? <Message severity="error" text={error} /> : undefined} dataTable={filteredAccounts.length === 0 && !loading ? <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200"><i className="pi pi-folder" /></span><h3 className="mt-4 text-sm font-semibold text-slate-900">Aucun dossier financier trouvé</h3><p className="mt-1 text-sm text-slate-500">Modifiez les filtres ou générez un nouveau dossier.</p></div></div> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><DataTable value={filteredAccounts} loading={loading} dataKey="id" paginator={filteredAccounts.length > 10} rows={10} rowsPerPageOptions={[10, 25, 50]} stripedRows className="text-sm" tableStyle={{ minWidth: "1120px" }}><Column header="Élève" field="studentName" sortable body={(account: FinancialAccount) => <div><strong className="block text-sm text-slate-900">{account.studentName}</strong><span className="text-xs text-slate-400">{account.matricule}</span></div>} /><Column field="levelName" header="Niveau" sortable body={(account: FinancialAccount) => <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{account.levelName || "Non défini"}</span>} /><Column header="Montant" body={(account: FinancialAccount) => formatAmount(account.totalAmount, account.currencyCode)} sortable sortField="totalAmount" /><Column header="Payé" body={(account: FinancialAccount) => <span className="font-medium text-emerald-700">{formatAmount(account.paidAmount, account.currencyCode)}</span>} sortable sortField="paidAmount" /><Column header="Reste" body={(account: FinancialAccount) => <strong className={account.balanceAmount > 0 ? "text-amber-700" : "text-slate-500"}>{formatAmount(account.balanceAmount, account.currencyCode)}</strong>} sortable sortField="balanceAmount" /><Column header="Progression" body={(account: FinancialAccount) => { const rate = account.totalAmount > 0 ? Math.min(100, (account.paidAmount / account.totalAmount) * 100) : 0; return <div className="min-w-28"><div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>Recouvré</span><span>{Math.round(rate)} %</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} /></div></div>; }} /><Column header="Statut" body={(account: FinancialAccount) => <Tag value={financialAccountStatusLabels[account.status]} severity={statusSeverity[account.status]} />} sortable sortField="status" /><Column header="" body={(account: FinancialAccount) => <Button label="Encaisser" icon="pi pi-wallet" size="small" outlined className="rounded-xl" disabled={account.balanceAmount <= 0 || account.status === "cancelled"} onClick={() => void openPayment(account)} />} /></DataTable></div>} />

      <Dialog header="Générer un dossier financier" visible={generationDialogOpen} modal className="form-dialog form-dialog-wide" onHide={() => { setGenerationDialogOpen(false); setEnrollmentId(undefined); }}><div className="form-grid"><div className="field field-wide"><label htmlFor="financial-enrollment">Inscription confirmée</label><Dropdown inputId="financial-enrollment" className="w-full" value={enrollmentId} options={enrollmentOptions} optionLabel="label" optionValue="value" placeholder="Sélectionner un élève" filter showClear onChange={(event) => setEnrollmentId(event.value)} /><small className="text-slate-500">GeeCole détecte les frais applicables et résout le plan de chaque frais automatiquement.</small></div><div className="dialog-actions field-wide"><Button label="Annuler" severity="secondary" outlined onClick={() => setGenerationDialogOpen(false)} /><Button label="Générer" icon="pi pi-check" loading={generating} disabled={!enrollmentId} onClick={() => void handleGenerate()} /></div></div></Dialog>

      <Dialog header="Encaisser un élève" visible={Boolean(paymentAccount)} modal className="w-[min(96vw,46rem)]" onHide={closePayment}>{paymentAccount ? <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div><div className="text-lg font-semibold">{paymentAccount.studentName}</div><div className="text-sm text-slate-500">{paymentAccount.matricule} · {paymentAccount.levelName}</div></div><div className="text-right"><div className="text-sm text-slate-500">Solde du dossier</div><div className="text-xl font-semibold">{formatAmount(paymentAccount.balanceAmount, paymentAccount.currencyCode)}</div></div></div><div className="field"><label htmlFor="payment-fee">Type d’encaissement</label><Dropdown inputId="payment-fee" className="w-full" value={selectedItemId} options={itemOptions} optionLabel="label" optionValue="value" placeholder="Choisir un frais" onChange={(event) => initializeSelectedItem(payableItems.find((item) => item.id === event.value))} /></div>{selectedItem ? <div className="rounded-lg border border-slate-200"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><div className="font-semibold">{selectedItem.label}</div><div className="text-sm text-slate-500">Plan : {selectedItem.paymentPlanName ?? "Paiement unique"}</div></div><Button label="Solder ce frais" size="small" severity="secondary" outlined onClick={settleSelectedItem} /></div><div className="divide-y divide-slate-100">{selectedInstallments.map((installment) => <div key={installment.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem] md:items-center"><div><div className="font-medium">{installment.label}</div><div className="text-sm text-slate-500">Échéance du {formatDate(installment.dueDate)}</div></div><div className="text-sm"><div className="text-slate-500">Demandé</div><div className="font-medium">{formatAmount(installment.amount, paymentAccount.currencyCode)}</div>{installment.paidAmount > 0 ? <div className="text-xs text-orange-600">Déjà payé {formatAmount(installment.paidAmount, paymentAccount.currencyCode)}</div> : null}</div><div className="field m-0"><label htmlFor={`installment-${installment.id}`}>Montant payé</label><InputNumber inputId={`installment-${installment.id}`} value={installmentAmounts[installment.id] ?? 0} min={0} max={installment.balanceAmount} mode="decimal" useGrouping className="w-full" onValueChange={(event) => setInstallmentAmount(installment.id, event.value ?? 0)} /><small className="text-slate-500">Reste {formatAmount(installment.balanceAmount, paymentAccount.currencyCode)}</small></div></div>)}</div></div> : null}<div className="grid gap-4 md:grid-cols-2"><div className="field"><label htmlFor="payment-method">Mode de paiement</label><Dropdown inputId="payment-method" value={method} options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} className="w-full" onChange={(event) => setMethod(event.value)} /></div><div className="field"><label htmlFor="payment-date">Date</label><Calendar inputId="payment-date" value={paymentDate} dateFormat="dd/mm/yy" className="w-full" onChange={(event) => event.value && setPaymentDate(event.value as Date)} /></div><div className="field"><label htmlFor="payment-reference">Référence</label><InputText id="payment-reference" value={reference} className="w-full" onChange={(event) => setReference(event.target.value)} /></div><div className="field md:col-span-2"><label htmlFor="payment-note">Note</label><InputTextarea id="payment-note" value={note} rows={2} className="w-full" onChange={(event) => setNote(event.target.value)} /></div></div><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"><div><div className="text-sm text-blue-700">Total reçu</div><div className="text-xl font-semibold text-blue-950">{formatAmount(paymentTotal, paymentAccount.currencyCode)}</div></div><div className="flex gap-2"><Button label="Annuler" severity="secondary" outlined onClick={closePayment} /><Button label="Enregistrer l’encaissement" icon="pi pi-check" loading={saving} disabled={!selectedItem || paymentTotal <= 0} onClick={() => void handlePayment()} /></div></div></div> : null}</Dialog>
    </div>
  );
}
