import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { 
  financialAccountStatusLabels, 
  type FinancialAccount, 
  type FinancialAccountDetails, 
  type FinancialAccountItem 
} from "../domain/financial-account";
import { paymentMethodLabels, type PaymentMethod } from "../domain/financial-payment";
import {
  listFinancialAccountsPage,
  reapplyAllFinancialAccounts,
  generateFinancialAccount,
  getFinancialAccount,
  listConfirmedEnrollmentsWithoutFinancialAccount,
  type FinancialGenerationError,
  type FinancialGenerationResult,
} from "../services/financial-accounts.service";
import { registerTargetedFinancialPayment } from "../services/financial-payments.service";

const formatAmount = (value: number, currency = "GNF") => `${Number(value).toLocaleString("fr-GN")} ${currency}`;
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);
const controlClass = "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

const logGenerationResult = (result: FinancialGenerationResult) => {
  const summary = { generated: result.generated, regenerated: result.regenerated, skippedPaid: result.skippedPaid, failed: result.failed };
  if (result.failed > 0) {
    console.groupCollapsed(`[Finance] Génération globale terminée avec ${result.failed} erreur(s)`);
    console.info("Résumé", summary);
    console.table(result.errors.map((error) => ({ enrollmentId: error.enrollmentId, code: error.code, correlationId: error.correlationId })));
    console.groupEnd();
    return;
  }
  console.info("[Finance] Génération globale terminée", summary);
};

export function FinancialAccountsWorkspacePage() {
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, year } = useAcademicSession();
  
  // États d'origine (Code 1)
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [cycle, setCycle] = useState("");
  const [balanceState, setBalanceState] = useState<"" | "settled" | "outstanding">("");
  const [advanced, setAdvanced] = useState(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [sortField, setSortField] = useState("studentName");
  const [sortOrder, setSortOrder] = useState<1 | -1>(1);
  const [confirmGlobal, setConfirmGlobal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<FinancialGenerationResult>();

  // Nouveaux états injectés pour l'encaissement et l'inscription unitaire (Code 2)
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string>();
  const [generatingUnit, setGeneratingUnit] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState<FinancialAccountDetails>();
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [installmentAmounts, setInstallmentAmounts] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Chargement fusionné
  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setFailure("");
    try {
      const [result, nextEnrollments] = await Promise.all([
        listFinancialAccountsPage(institutionId, year.id, {
          first,
          rows,
          search,
          status,
          level,
          cycle,
          balanceState: balanceState || undefined,
          sortField,
          sortOrder,
        }),
        listConfirmedEnrollmentsWithoutFinancialAccount(institutionId, year.id).catch(() => [])
      ]);
      setAccounts(result.rows);
      setTotalRecords(result.total);
      setEnrollments(nextEnrollments);
    } catch (cause) {
      console.error("[Finance] Impossible de charger les dossiers dossiers", cause);
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger les dossiers financiers.");
    } finally {
      setLoading(false);
    }
  }, [balanceState, cycle, first, institutionId, level, rows, search, sortField, sortOrder, status, year]);

  useEffect(() => { void load(); }, [load]);

  // Calculs de stats d'origine
  const pageStats = useMemo(() => {
    const total = accounts.reduce((sum, account) => sum + account.totalAmount, 0);
    const paid = accounts.reduce((sum, account) => sum + account.paidAmount, 0);
    const balance = accounts.reduce((sum, account) => sum + account.balanceAmount, 0);
    const settled = accounts.filter((account) => account.balanceAmount <= 0).length;
    return { total, paid, balance, settled };
  }, [accounts]);

  const levelOptions = useMemo(() => [
    { label: "Tous les niveaux", value: "" },
    ...Array.from(new Set(accounts.map((account) => account.levelName))).filter(Boolean).sort((a, b) => a.localeCompare(b, "fr")).map((value) => ({ label: value, value })),
  ], [accounts]);

  const cycleOptions = useMemo(() => [
    { label: "Tous les cycles", value: "" },
    ...Array.from(new Set(accounts.map((account) => account.cycleName))).filter(Boolean).sort((a, b) => a.localeCompare(b, "fr")).map((value) => ({ label: value, value })),
  ], [accounts]);

  const activeFilterCount = [search, status, level, cycle, balanceState].filter(Boolean).length;
  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setLevel("");
    setCycle("");
    setBalanceState("");
    setFirst(0);
  };

  const onPage = (event: DataTablePageEvent) => { setFirst(event.first); setRows(event.rows); };
  const onSort = (event: DataTableSortEvent) => { setFirst(0); setSortField(String(event.sortField ?? "studentName")); setSortOrder(event.sortOrder === -1 ? -1 : 1); };

  // Logique de génération globale d'origine
  const generateGlobal = async () => {
    if (!year) return;
    setGenerating(true);
    setGenerationResult(undefined);
    try {
      const result = await reapplyAllFinancialAccounts(institutionId, year.id);
      logGenerationResult(result);
      setConfirmGlobal(false);
      setGenerationResult(result);
      await load();
      notify({ severity: result.failed ? "warn" : "success", summary: "Génération globale terminée", detail: `${result.generated} créés, ${result.regenerated} régénérés, ${result.skippedPaid} conservés, ${result.failed} erreur(s).` });
    } catch (cause) {
      console.error("[Finance] Échec complet de la génération globale", { institutionId, academicYearId: year.id, cause });
      notify({ severity: "error", summary: "Génération impossible", detail: cause instanceof Error ? cause.message : "Une erreur inattendue est survenue." });
    } finally {
      setGenerating(false);
    }
  };

  // Fonctions injectées pour le dossier unitaire et l'encaissement ciblé
  const enrollmentOptions = enrollments.map((enrollment) => {
    const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
    return { value: enrollment.id, label: `${student?.first_name ?? ""} ${student?.last_name ?? ""} — ${enrollment.level_name_snapshot}`.trim() };
  });

  const handleGenerateUnit = async () => {
    if (!enrollmentId) return;
    setGeneratingUnit(true);
    try {
      await generateFinancialAccount(enrollmentId);
      setGenerationDialogOpen(false);
      setEnrollmentId(undefined);
      await load();
      notify({ severity: "success", summary: "Dossier financier généré" });
    } catch (cause) {
      notify({ severity: "error", summary: "Génération impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally { setGeneratingUnit(false); }
  };

  const selectedItem = useMemo(() => paymentAccount?.items.find((item) => item.id === selectedItemId), [paymentAccount, selectedItemId]);
  const payableItems = useMemo(() => (paymentAccount?.items ?? []).filter((item) => (item.installments ?? []).some((installment) => installment.balanceAmount > 0)), [paymentAccount]);
  const itemOptions = useMemo(() => payableItems.map((item) => {
    const remaining = (item.installments ?? []).reduce((sum, installment) => sum + installment.balanceAmount, 0);
    return { value: item.id, label: `${item.label} — ${formatAmount(remaining, paymentAccount?.currencyCode)}` };
  }), [payableItems, paymentAccount?.currencyCode]);
  
  // On liste toutes les échéances pour pouvoir afficher les grisées/soldées
  const allInstallments = useMemo(() => selectedItem?.installments ?? [], [selectedItem]);
  const paymentTotal = useMemo(() => allInstallments.reduce((sum, installment) => sum + (installmentAmounts[installment.id] ?? 0), 0), [installmentAmounts, allInstallments]);

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
  
  const setInstallmentAmount = (installmentId: string, value: number | null) => {
    setInstallmentAmounts((current) => ({ ...current, [installmentId]: value ?? 0 }));
  };

  // Case à cocher : pré-remplit le montant complet ou repasse à 0
  const toggleInstallmentCheckbox = (installmentId: string, checked: boolean, maxAmount: number) => {
    setInstallmentAmounts((current) => ({
      ...current,
      [installmentId]: checked ? maxAmount : 0
    }));
  };

  const settleSelectedItem = () => setInstallmentAmounts(allInstallments.reduce<Record<string, number>>((result, installment) => { result[installment.id] = installment.balanceAmount; return result; }, {}));

  const handlePayment = async () => {
    if (!paymentAccount || !selectedItem || paymentTotal <= 0) return;
    const allocations = allInstallments.map((installment) => ({ installmentId: installment.id, amount: installmentAmounts[installment.id] ?? 0 })).filter((allocation) => allocation.amount > 0);
    if (allInstallments.some((installment) => (installmentAmounts[installment.id] ?? 0) > installment.balanceAmount)) return;
    setSavingPayment(true);
    try {
      await registerTargetedFinancialPayment({ financialAccountId: paymentAccount.id, allocations, method, paymentDate: toDateInput(paymentDate), externalReference: reference, note });
      closePayment(); await load(); notify({ severity: "success", summary: "Encaissement enregistré" });
    } catch (cause) {
      notify({ severity: "error", summary: "Encaissement impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally { setSavingPayment(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const statCards = [
    { label: "Montant appelé", value: formatAmount(pageStats.total), hint: "Sur la page affichée", icon: "pi-file" },
    { label: "Déjà encaissé", value: formatAmount(pageStats.paid), hint: "Paiements comptabilisés", icon: "pi-wallet" },
    { label: "Reste à payer", value: formatAmount(pageStats.balance), hint: "Solde des dossiers visibles", icon: "pi-chart-line" },
    { label: "Dossiers soldés", value: String(pageStats.settled), hint: `${accounts.length} dossier${accounts.length > 1 ? "s" : ""} sur cette page`, icon: "pi-check-circle" },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* En-tête */}
      <PageHeader
        title="Dossiers financiers"
        description={`Suivez les frais, encaissements et soldes des élèves pour ${year.name}.`}
        meta={<div className="flex items-center gap-2 text-sm text-slate-500"><MetricIcon icon="pi-wallet" /><strong className="font-semibold text-slate-900">{totalRecords}</strong><span>dossier{totalRecords > 1 ? "s" : ""}</span></div>}
        actions={
          <div className="flex items-center gap-2">
            <Button label="Générer un dossier" icon="pi pi-plus" className="h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 px-3 text-sm shadow-none hover:bg-slate-200" disabled={!enrollments.length} onClick={() => setGenerationDialogOpen(true)} />
            <Button label="Générer / réappliquer" icon="pi pi-refresh" className="h-10 rounded-xl bg-emerald-600 px-3 text-sm shadow-none hover:bg-emerald-700" onClick={() => setConfirmGlobal(true)} />
          </div>
        }
      />

      {/* Cartes statistiques */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-950">Vue financière</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{year.name}</span></div>
        <div className="grid ps-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">{statCards.map((card) => <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</span><MetricIcon icon={card.icon} /></div><strong className="mt-4 block text-xl font-bold tracking-tight text-slate-950">{card.value}</strong><span className="mt-1 block text-xs text-slate-500">{card.hint}</span></article>)}</div>
      </section>

      {failure ? <Message severity="error" text={failure} /> : null}

      {/* Section des filtres */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px]">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span>
                <span className="p-input-icon-left block w-full"><i className="pi pi-search left-3 text-sm text-slate-400" /><InputText value={search} className={`${controlClass} pl-9`} placeholder="Élève, matricule, niveau ou cycle" onChange={(event) => { setFirst(0); setSearch(event.target.value); }} /></span>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Statut</span>
                <Dropdown className={controlClass} value={status} options={[{ label: "Tous les statuts", value: "" }, ...Object.entries(financialAccountStatusLabels).map(([value, label]) => ({ value, label }))]} onChange={(event) => { setFirst(0); setStatus(String(event.value)); }} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Niveau</span>
                <Dropdown className={controlClass} value={level} options={levelOptions} onChange={(event) => { setFirst(0); setLevel(String(event.value)); }} />
              </label>
            </div>
            <div className="ml-auto flex min-h-10 flex-wrap items-center justify-end gap-2">
              {activeFilterCount > 0 ? <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" text onClick={resetFilters} /> : null}
              <Button label={advanced ? "Masquer" : "Plus de filtres"} icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"} severity="secondary" outlined badge={activeFilterCount > 0 ? String(activeFilterCount) : undefined} onClick={() => setAdvanced((value) => !value)} />
            </div>
          </div>
        </div>
        {advanced ? (
          <div className="border-t border-emerald-100 bg-emerald-50/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="m-0 text-sm font-semibold text-slate-900">Filtres avancés</h3><p className="mt-0.5 text-xs text-slate-500">Affinez les dossiers sans quitter la liste.</p></div><MetricIcon icon="pi-sliders-h" /></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Cycle</span><Dropdown className={controlClass} value={cycle} options={cycleOptions} onChange={(event) => { setFirst(0); setCycle(String(event.value)); }} /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Situation du solde</span><Dropdown className={controlClass} value={balanceState} options={[{ label: "Tous les soldes", value: "" }, { label: "Soldés", value: "settled" }, { label: "Reste à payer", value: "outstanding" }]} onChange={(event) => { setFirst(0); setBalanceState(event.value); }} /></label>
            </div>
          </div>
        ) : null}
      </section>

      {/* Tableau */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid min-h-[360px] place-items-center"><div className="text-center"><ProgressSpinner className="size-10" strokeWidth="4" /><p className="mt-3 text-sm font-medium text-slate-500">Chargement des dossiers…</p></div></div>
        ) : accounts.length === 0 ? (
          <div className="grid min-h-[360px] place-items-center p-8 text-center"><div className="max-w-sm"><MetricIcon icon="pi-wallet" size="md" tone="slate" className="mx-auto" /><h3 className="mt-4 text-sm font-semibold text-slate-900">Aucun dossier financier</h3><p className="mt-1 text-sm leading-6 text-slate-500">Modifiez les filtres ou générez les frais de l’année scolaire.</p></div></div>
        ) : (
          <DataTable value={accounts} lazy paginator first={first} rows={rows} totalRecords={totalRecords} rowsPerPageOptions={[10, 25, 50]} sortField={sortField} sortOrder={sortOrder} onPage={onPage} onSort={onSort} dataKey="id" stripedRows selectionMode="single" onRowClick={(event) => navigate(`/gestion-financiere/dossiers/${event.data.id}`)} rowClassName={() => "cursor-pointer"} className="text-sm" tableStyle={{ minWidth: "1100px" }}>
            <Column field="studentName" header="Élève" sortable body={(row: FinancialAccount) => <div><strong className="block text-sm text-slate-900">{row.studentName}</strong><span className="text-xs text-slate-400">{row.matricule}</span></div>} />
            <Column field="levelName" header="Niveau" sortable body={(row: FinancialAccount) => <div><span className="block text-sm text-slate-700">{row.levelName}</span><span className="text-xs text-slate-400">{row.cycleName}</span></div>} />
            <Column header="Montant net" body={(row: FinancialAccount) => <strong className="text-slate-950">{formatAmount(row.totalAmount, row.currencyCode)}</strong>} sortable sortField="totalAmount" />
            <Column header="Payé" body={(row: FinancialAccount) => <span className="font-semibold text-emerald-700">{formatAmount(row.paidAmount, row.currencyCode)}</span>} sortable sortField="paidAmount" />
            
            <Column header="Progression" body={(row: FinancialAccount) => {
              const percent = row.totalAmount > 0 ? Math.min(100, Math.round((row.paidAmount / row.totalAmount) * 100)) : 0;
              return (
                <div className="w-36 space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full transition-all duration-300 ${percent === 100 ? "bg-emerald-500" : percent > 50 ? "bg-blue-500" : percent > 0 ? "bg-amber-500" : "bg-slate-300"}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            }} />

            <Column header="Reste" body={(row: FinancialAccount) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{formatAmount(row.balanceAmount, row.currencyCode)}</strong>} sortable sortField="balanceAmount" />
            <Column header="Statut" body={(row: FinancialAccount) => <Tag value={financialAccountStatusLabels[row.status]} severity={row.balanceAmount > 0 ? "warning" : "success"} />} sortable sortField="status" />
            
            <Column header="Actions" body={(row: FinancialAccount) => (
              <Button size="small" rounded outlined severity="success" onClick={(e) => { e.stopPropagation(); void openPayment(row); }}>Encaisser</Button>
            )} />
            
            <Column header="" body={() => <i className="pi pi-chevron-right text-slate-400" />} />
          </DataTable>
        )}
      </section>

      {/* Dialogues originaux */}
      <Dialog header="Générer et réappliquer les frais" visible={confirmGlobal} modal className="w-[min(94vw,38rem)]" onHide={() => setConfirmGlobal(false)}>
        <div className="space-y-4"><Message severity="info" text="Les dossiers absents seront créés. Les dossiers sans paiement seront régénérés selon la grille actuelle. Les dossiers ayant déjà un encaissement seront conservés pour ne pas modifier l’historique financier." /><div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined disabled={generating} onClick={() => setConfirmGlobal(false)} /><Button label="Lancer la génération" icon="pi pi-refresh" loading={generating} onClick={() => void generateGlobal()} /></div></div>
      </Dialog>

      <Dialog header="Rapport de génération" visible={Boolean(generationResult)} modal maximizable className="w-[min(96vw,70rem)]" onHide={() => setGenerationResult(undefined)}>
        {generationResult ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Créés", generationResult.generated], ["Régénérés", generationResult.regenerated], ["Conservés", generationResult.skippedPaid], ["Erreurs", generationResult.failed],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-2 text-2xl font-bold ${label === "Erreurs" ? "text-red-600" : "text-slate-950"}`}>{value}</div></div>)}</div>{generationResult.errors.length ? <><Message severity="error" text="Certains dossiers n’ont pas pu être générés. Utilisez l’identifiant de corrélation pour le diagnostic." /><DataTable value={generationResult.errors} dataKey="enrollmentId" paginator rows={10} rowsPerPageOptions={[10, 25, 50]} stripedRows emptyMessage="Aucune erreur retournée."><Column field="studentName" header="Élève" /><Column field="matricule" header="Matricule" /><Column field="levelName" header="Niveau" /><Column field="code" header="Code" body={(error: FinancialGenerationError) => <Tag value={error.code || "INCONNU"} severity="danger" />} /><Column header="Message" body={() => "Le dossier financier n’a pas pu être généré."} /><Column field="correlationId" header="Corrélation" /></DataTable></> : <Message severity="success" text="Tous les dossiers ont été traités sans erreur." />}<div className="flex justify-end"><Button label="Fermer" onClick={() => setGenerationResult(undefined)} /></div></div> : null}
      </Dialog>

      {/* Dialogue : Générer un Dossier Unitaire */}
      <Dialog header="Générer un dossier financier" visible={generationDialogOpen} modal className="w-[min(94vw,32rem)]" onHide={() => setGenerationDialogOpen(false)}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Élève inscrit sans dossier</span>
            <Dropdown className={controlClass} value={enrollmentId} options={enrollmentOptions} filter placeholder="Sélectionner un élève" onChange={(e) => setEnrollmentId(e.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <Button label="Annuler" severity="secondary" outlined onClick={() => setGenerationDialogOpen(false)} />
            <Button label="Générer" icon="pi pi-check" loading={generatingUnit} disabled={!enrollmentId} onClick={() => void handleGenerateUnit()} />
          </div>
        </div>
      </Dialog>

      {/* Dialogue : Enregistrer un encaissement ciblé avec checkboxes et gestion des lignes grisées */}
      <Dialog header={`Encaissement — ${paymentAccount?.studentName ?? ""}`} visible={Boolean(paymentAccount)} modal className="w-[min(96vw,46rem)]" onHide={closePayment}>
        {paymentAccount ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Frais concerné</span>
                <Dropdown className={controlClass} value={selectedItemId} options={itemOptions} placeholder="Sélectionner un frais" onChange={(e) => initializeSelectedItem(paymentAccount.items.find((i) => i.id === e.value))} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Mode de paiement</span>
                <Dropdown className={controlClass} value={method} options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} onChange={(e) => setMethod(e.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Date de paiement</span>
                <Calendar className="w-full" inputClassName={controlClass} value={paymentDate} onChange={(e) => setPaymentDate(e.value as Date)} dateFormat="dd/mm/yy" showIcon />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Référence externe</span>
                <InputText className={controlClass} value={reference} placeholder="N° chèque, virement, reçu..." onChange={(e) => setReference(e.target.value)} />
              </label>
            </div>

            {selectedItem ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Échéances de : {selectedItem.label}</h4>
                  <Button label="Tout solder" size="small" severity="success" text onClick={settleSelectedItem} />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {allInstallments.map((installment) => {
                    const isSolded = installment.balanceAmount === 0;
                    const isChecked = (installmentAmounts[installment.id] ?? 0) === installment.balanceAmount && !isSolded;
                    
                    return (
                      <div key={installment.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 transition-colors ${isSolded ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center gap-3">
                          {/* Case à cocher pour pré-remplir */}
                          <Checkbox id={`chk-${installment.id}`} checked={isSolded || isChecked} disabled={isSolded} onChange={(e) => toggleInstallmentCheckbox(installment.id, Boolean(e.checked), installment.balanceAmount)} />
                          <label htmlFor={`chk-${installment.id}`} className={`block text-sm font-medium cursor-pointer ${isSolded ? "text-slate-400" : "text-slate-700"}`}>
                            <span>{installment.label}</span>
                            <span className="block text-xs font-normal text-slate-400">
                              {isSolded ? "Soldé" : `Reste : ${formatAmount(installment.balanceAmount, paymentAccount.currencyCode)}`}
                              {installment.dueDate ? ` avant le ${formatDate(installment.dueDate)}` : ""}
                            </span>
                          </label>
                        </div>
                        
                        <InputNumber className="h-9 w-32" inputClassName="h-full w-full rounded-lg border border-slate-300 text-right text-sm px-2 disabled:bg-slate-50" value={isSolded ? installment.amount : (installmentAmounts[installment.id] ?? null)} min={0} max={installment.balanceAmount} disabled={isSolded} mode="currency" currency={paymentAccount.currencyCode || "GNF"} locale="fr-GN" onChange={(e) => setInstallmentAmount(installment.id, e.value)} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
                  <span className="font-medium text-slate-600">Total à encaisser :</span>
                  <strong className="text-base font-bold text-emerald-700">{formatAmount(paymentTotal, paymentAccount.currencyCode)}</strong>
                </div>
              </div>
            ) : (
              <Message severity="info" text="Sélectionnez un frais pour répartir l’encaissement sur ses échéances." />
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Note interne</span>
              <InputTextarea className="w-full rounded-xl border border-slate-300 p-2 text-sm" rows={2} value={note} placeholder="Remarques complémentaires..." onChange={(e) => setNote(e.target.value)} />
            </label>

            <div className="flex justify-end gap-2">
              <Button label="Annuler" severity="secondary" outlined onClick={closePayment} />
              <Button label="Confirmer l'encaissement" icon="pi pi-check" severity="success" loading={savingPayment} disabled={!selectedItem || paymentTotal <= 0} onClick={() => void handlePayment()} />
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
