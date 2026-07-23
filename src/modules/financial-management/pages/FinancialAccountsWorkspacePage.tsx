import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, type DataTableExpandedRows, type DataTablePageEvent, type DataTableValueArray } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { financialAccountStatusLabels, type FinancialAccount } from "../domain/financial-account";
import {
  generateFinancialAccount,
  listConfirmedEnrollmentsWithoutFinancialAccount,
  listFinancialAccountsPage,
  listFinancialGenerationReports,
  reapplyAllFinancialAccounts,
  type FinancialGenerationReport,
  type FinancialGenerationResult,
} from "../services/financial-accounts.service";

const formatAmount = (value: number, currency = "GNF") => `${Number(value).toLocaleString("fr-GN")} ${currency}`;
const formatDateTime = (value: string) => new Date(value).toLocaleString("fr-FR");
const controlClass = "h-10 rounded-lg border border-slate-300 bg-white text-sm shadow-sm";

type FamilyGroup = {
  id: string;
  responsibleName: string;
  responsiblePhone: string;
  accounts: FinancialAccount[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
};

export function FinancialAccountsWorkspacePage() {
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, year, yearId } = useAcademicSession();
  const academicYearId = yearId ?? year?.id ?? "";
  const academicYearName = year?.name ?? "Année scolaire";

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [reports, setReports] = useState<FinancialGenerationReport[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [cycle, setCycle] = useState("");
  const [balanceState, setBalanceState] = useState<"" | "settled" | "outstanding">("");
  const [viewMode, setViewMode] = useState<"students" | "families">("students");
  const [activeTab, setActiveTab] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(25);
  const [expandedRows, setExpandedRows] = useState<DataTableExpandedRows | DataTableValueArray>();
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [globalDialogOpen, setGlobalDialogOpen] = useState(false);
  const [reportDialog, setReportDialog] = useState<FinancialGenerationReport | FinancialGenerationResult>();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string>();
  const [generating, setGenerating] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!academicYearId) return;
    const result = await listFinancialAccountsPage(institutionId, academicYearId, {
      first: viewMode === "families" ? 0 : first,
      rows: viewMode === "families" ? 1000 : rows,
      search,
      status,
      level,
      cycle,
      balanceState: balanceState || undefined,
      sortField: "studentName",
      sortOrder: 1,
    });
    setAccounts(result.rows);
    setTotalRecords(result.total);
  }, [academicYearId, balanceState, cycle, first, institutionId, level, rows, search, status, viewMode]);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [nextEnrollments, nextReports] = await Promise.all([
        listConfirmedEnrollmentsWithoutFinancialAccount(institutionId, academicYearId).catch(() => []),
        listFinancialGenerationReports(institutionId, academicYearId).catch(() => []),
      ]);
      setEnrollments(nextEnrollments);
      setReports(nextReports);
      await loadAccounts();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger les dossiers financiers.");
    } finally {
      setLoading(false);
    }
  }, [academicYearId, institutionId, loadAccounts]);

  useEffect(() => { void load(); }, [load]);

  const levelOptions = useMemo(() => [
    { label: "Tous les niveaux", value: "" },
    ...Array.from(new Set(accounts.map((account) => account.levelName))).filter(Boolean).sort().map((value) => ({ label: value, value })),
  ], [accounts]);

  const cycleOptions = useMemo(() => [
    { label: "Tous les cycles", value: "" },
    ...Array.from(new Set(accounts.map((account) => account.cycleName))).filter(Boolean).sort().map((value) => ({ label: value, value })),
  ], [accounts]);

  const families = useMemo<FamilyGroup[]>(() => {
    const groups = new Map<string, FamilyGroup>();
    accounts.forEach((account) => {
      const id = account.financialResponsibleId || `student:${account.studentId}`;
      const current = groups.get(id) ?? {
        id,
        responsibleName: account.financialResponsibleName || "Responsable financier non renseigné",
        responsiblePhone: account.financialResponsiblePhone || "",
        accounts: [],
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
      };
      current.accounts.push(account);
      current.totalAmount += account.totalAmount;
      current.paidAmount += account.paidAmount;
      current.balanceAmount += account.balanceAmount;
      groups.set(id, current);
    });
    return [...groups.values()].sort((left, right) => left.responsibleName.localeCompare(right.responsibleName, "fr"));
  }, [accounts]);

  const summary = useMemo(() => ({
    total: accounts.reduce((sum, account) => sum + account.totalAmount, 0),
    paid: accounts.reduce((sum, account) => sum + account.paidAmount, 0),
    balance: accounts.reduce((sum, account) => sum + account.balanceAmount, 0),
    settled: accounts.filter((account) => account.balanceAmount <= 0).length,
  }), [accounts]);

  const activeFilterCount = [status, level, cycle, balanceState].filter(Boolean).length;
  const resetFilters = () => { setSearch(""); setStatus(""); setLevel(""); setCycle(""); setBalanceState(""); setFirst(0); };

  const handleGenerateUnit = async () => {
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

  const handleGenerateAll = async () => {
    if (!academicYearId) return;
    setGenerating(true);
    try {
      const result = await reapplyAllFinancialAccounts(institutionId, academicYearId);
      setReportDialog(result);
      setGlobalDialogOpen(false);
      await load();
      notify({ severity: result.failed ? "warn" : "success", summary: "Génération terminée", detail: `${result.generated} créés, ${result.regenerated} régénérés, ${result.failed} erreur(s).` });
    } catch (cause) {
      notify({ severity: "error", summary: "Génération impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally { setGenerating(false); }
  };

  const enrollmentOptions = useMemo(() => enrollments.map((enrollment) => {
    const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
    return { value: enrollment.id, label: `${student?.first_name ?? ""} ${student?.last_name ?? ""} — ${enrollment.level_name_snapshot}`.trim() };
  }), [enrollments]);

  const accountActions = (account: FinancialAccount) => (
    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      <Button label="Ouvrir" size="small" severity="secondary" text onClick={() => navigate(`/gestion-financiere/dossiers/${account.id}`)} />
      <Button label="Encaisser" icon="pi pi-wallet" size="small" disabled={account.balanceAmount <= 0} onClick={() => navigate(`/gestion-financiere/dossiers/${account.id}/encaissement`)} />
    </div>
  );

  const accountTable = (value: FinancialAccount[]) => (
    <div className="max-w-full overflow-x-auto">
      <DataTable value={value} dataKey="id" scrollable scrollHeight="260px" className="text-sm" tableStyle={{ minWidth: "980px" }} onRowClick={(event) => navigate(`/gestion-financiere/dossiers/${event.data.id}`)} rowClassName={() => "cursor-pointer"}>
        <Column header="Élève" frozen style={{ minWidth: "220px" }} body={(row: FinancialAccount) => <div className="min-w-0"><strong className="block truncate text-slate-950">{row.studentName}</strong><span className="mt-1 block truncate text-xs text-slate-500">{row.matricule}</span></div>} />
        <Column header="Classe" style={{ minWidth: "150px" }} body={(row: FinancialAccount) => <div>{row.levelName}<span className="mt-1 block text-xs text-slate-500">{row.cycleName}</span></div>} />
        <Column header="Net à payer" style={{ minWidth: "150px" }} body={(row: FinancialAccount) => <strong>{formatAmount(row.totalAmount, row.currencyCode)}</strong>} />
        <Column header="Payé" style={{ minWidth: "140px" }} body={(row: FinancialAccount) => <span className="font-semibold text-emerald-700">{formatAmount(row.paidAmount, row.currencyCode)}</span>} />
        <Column header="Reste" style={{ minWidth: "140px" }} body={(row: FinancialAccount) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{formatAmount(row.balanceAmount, row.currencyCode)}</strong>} />
        <Column header="" style={{ minWidth: "190px" }} body={accountActions} />
      </DataTable>
    </div>
  );

  if (!academicYearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const cards = [
    { label: "Net à payer", value: formatAmount(summary.total), hint: "Dossiers visibles", icon: "pi-file" },
    { label: "Déjà encaissé", value: formatAmount(summary.paid), hint: "Paiements comptabilisés", icon: "pi-wallet" },
    { label: "Reste à payer", value: formatAmount(summary.balance), hint: "Solde à recouvrer", icon: "pi-chart-line" },
    { label: "Dossiers soldés", value: `${summary.settled} / ${accounts.length}`, hint: "Sur la sélection", icon: "pi-check-circle" },
  ];

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title="Dossiers financiers" description={`Rechercher, comprendre et traiter la situation financière des élèves pour ${academicYearName}.`} actions={<div className="flex flex-wrap gap-2"><Button label="Générer un dossier" icon="pi pi-plus" severity="secondary" outlined disabled={!enrollments.length} onClick={() => setGenerationDialogOpen(true)} /><Button label="Générer / réappliquer" icon="pi pi-refresh" onClick={() => setGlobalDialogOpen(true)} /></div>} />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <TabView activeIndex={activeTab} onTabChange={(event) => setActiveTab(event.index)} className="financial-page-tabs">
          <TabPanel header="Dossiers" />
          <TabPanel header={`Rapports de génération (${reports.length})`} />
        </TabView>
      </section>

      {activeTab === 0 ? <>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="m-0 text-base font-semibold text-slate-950">Vue financière</h2><p className="mt-1 text-sm text-slate-500">Synthèse des dossiers actuellement affichés.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{academicYearName}</span></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</span><MetricIcon icon={card.icon} /></div><strong className="mt-4 block text-xl font-bold tracking-tight text-slate-950">{card.value}</strong><span className="mt-1 block text-xs text-slate-500">{card.hint}</span></article>)}</div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto p-4"><div className="flex min-w-max items-end gap-2">
            <label className="w-[340px]"><span className="mb-1 block text-xs font-semibold text-slate-600">Recherche</span><span className="p-input-icon-left block"><i className="pi pi-search" /><InputText value={search} className={`${controlClass} w-full pl-9`} placeholder="Élève, matricule, responsable ou téléphone" onChange={(event) => { setFirst(0); setSearch(event.target.value); }} /></span></label>
            <label className="w-48"><span className="mb-1 block text-xs font-semibold text-slate-600">Situation</span><Dropdown value={balanceState} className={`${controlClass} w-full`} options={[{ label: "Toutes les situations", value: "" }, { label: "Reste à payer", value: "outstanding" }, { label: "Dossiers soldés", value: "settled" }]} onChange={(event) => { setFirst(0); setBalanceState(event.value); }} /></label>
            <Button label={advanced ? "Masquer" : "Plus de filtres"} icon="pi pi-sliders-h" severity="secondary" outlined badge={activeFilterCount ? String(activeFilterCount) : undefined} onClick={() => setAdvanced((value) => !value)} />
            {search || activeFilterCount ? <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" text onClick={resetFilters} /> : null}
          </div></div>
          {advanced ? <div className="border-t border-emerald-100 bg-emerald-50/35 p-3"><div className="flex min-w-max items-end gap-2 overflow-x-auto">
            <label className="w-44"><span className="mb-1 block text-xs font-semibold text-slate-600">Statut</span><Dropdown value={status} className={`${controlClass} w-full`} options={[{ label: "Tous", value: "" }, ...Object.entries(financialAccountStatusLabels).map(([value, label]) => ({ value, label }))]} onChange={(event) => { setFirst(0); setStatus(String(event.value)); }} /></label>
            <label className="w-44"><span className="mb-1 block text-xs font-semibold text-slate-600">Cycle</span><Dropdown value={cycle} className={`${controlClass} w-full`} options={cycleOptions} onChange={(event) => { setFirst(0); setCycle(String(event.value)); }} /></label>
            <label className="w-44"><span className="mb-1 block text-xs font-semibold text-slate-600">Niveau</span><Dropdown value={level} className={`${controlClass} w-full`} options={levelOptions} onChange={(event) => { setFirst(0); setLevel(String(event.value)); }} /></label>
          </div></div> : null}
        </section>

        {failure ? <Message severity="error" text={failure} /> : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div><h2 className="m-0 text-sm font-semibold text-slate-950">Liste des dossiers</h2><p className="mt-1 text-xs text-slate-500">Un dossier par inscription annuelle.</p></div>
            <SelectButton value={viewMode} options={[{ label: "Élèves", value: "students" }, { label: "Fratries", value: "families" }]} optionLabel="label" optionValue="value" allowEmpty={false} className="compact-select-button" onChange={(event) => { setFirst(0); setExpandedRows(undefined); setViewMode(event.value); }} />
          </div>
          {loading ? <div className="grid min-h-[360px] place-items-center"><ProgressSpinner /></div> : viewMode === "students" ? (
            <div className="max-w-full overflow-x-auto">
              <DataTable value={accounts} lazy paginator first={first} rows={rows} totalRecords={totalRecords} rowsPerPageOptions={[10, 25, 50]} onPage={(event: DataTablePageEvent) => { setFirst(event.first); setRows(event.rows); }} dataKey="id" stripedRows scrollable scrollHeight="520px" className="text-sm" tableStyle={{ minWidth: "1280px" }} onRowClick={(event) => navigate(`/gestion-financiere/dossiers/${event.data.id}`)} rowClassName={() => "cursor-pointer"} emptyMessage="Aucun dossier ne correspond aux filtres.">
                <Column header="Élève" frozen style={{ minWidth: "230px" }} body={(row: FinancialAccount) => <div className="min-w-0"><strong className="block truncate text-slate-950">{row.studentName}</strong><span className="mt-1 block truncate text-xs text-slate-500">{row.matricule}</span></div>} />
                <Column header="Responsable financier" style={{ minWidth: "230px" }} body={(row: FinancialAccount) => <div className="min-w-0"><span className="block truncate">{row.financialResponsibleName || "Non renseigné"}</span><span className="mt-1 block truncate text-xs text-slate-500">{row.financialResponsiblePhone || "Téléphone absent"}</span></div>} />
                <Column header="Classe" style={{ minWidth: "160px" }} body={(row: FinancialAccount) => <div>{row.levelName}<span className="mt-1 block text-xs text-slate-500">{row.cycleName}</span></div>} />
                <Column header="Net à payer" style={{ minWidth: "155px" }} body={(row: FinancialAccount) => <strong>{formatAmount(row.totalAmount, row.currencyCode)}</strong>} />
                <Column header="Payé" style={{ minWidth: "145px" }} body={(row: FinancialAccount) => <span className="font-semibold text-emerald-700">{formatAmount(row.paidAmount, row.currencyCode)}</span>} />
                <Column header="Reste" style={{ minWidth: "145px" }} body={(row: FinancialAccount) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{formatAmount(row.balanceAmount, row.currencyCode)}</strong>} />
                <Column header="Situation" style={{ minWidth: "130px" }} body={(row: FinancialAccount) => <Tag value={row.balanceAmount <= 0 ? "Soldé" : financialAccountStatusLabels[row.status]} severity={row.balanceAmount <= 0 ? "success" : "warning"} />} />
                <Column header="" style={{ minWidth: "190px" }} body={accountActions} />
              </DataTable>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <DataTable value={families} dataKey="id" expandedRows={expandedRows} onRowToggle={(event) => setExpandedRows(event.data)} rowExpansionTemplate={(family: FamilyGroup) => <div className="max-w-full overflow-hidden border-y border-emerald-100 bg-emerald-50/30 p-3">{accountTable(family.accounts)}</div>} scrollable scrollHeight="520px" className="text-sm" tableStyle={{ minWidth: "1080px" }} emptyMessage="Aucune fratrie ne correspond aux filtres.">
                <Column expander frozen style={{ width: "3rem" }} />
                <Column header="Responsable financier" frozen style={{ minWidth: "260px" }} body={(row: FamilyGroup) => <div className="min-w-0"><strong className="block truncate text-slate-950">{row.responsibleName}</strong><span className="mt-1 block truncate text-xs text-slate-500">{row.responsiblePhone || "Téléphone absent"}</span></div>} />
                <Column header="Enfants" style={{ minWidth: "120px" }} body={(row: FamilyGroup) => <Tag value={`${row.accounts.length} enfant${row.accounts.length > 1 ? "s" : ""}`} severity="info" />} />
                <Column header="Net à payer" style={{ minWidth: "160px" }} body={(row: FamilyGroup) => <strong>{formatAmount(row.totalAmount)}</strong>} />
                <Column header="Payé" style={{ minWidth: "150px" }} body={(row: FamilyGroup) => <span className="font-semibold text-emerald-700">{formatAmount(row.paidAmount)}</span>} />
                <Column header="Reste" style={{ minWidth: "150px" }} body={(row: FamilyGroup) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{formatAmount(row.balanceAmount)}</strong>} />
                <Column header="Situation" style={{ minWidth: "150px" }} body={(row: FamilyGroup) => <Tag value={row.balanceAmount <= 0 ? "Famille soldée" : "Paiement attendu"} severity={row.balanceAmount <= 0 ? "success" : "warning"} />} />
              </DataTable>
            </div>
          )}
        </section>
      </> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h2 className="m-0 text-base font-semibold text-slate-950">Rapports de génération</h2><p className="mt-1 text-sm text-slate-500">Chaque exécution globale est conservée avec son résultat et ses erreurs.</p></div><Button label="Nouvelle génération" icon="pi pi-refresh" size="small" onClick={() => setGlobalDialogOpen(true)} /></div>
        <div className="max-w-full overflow-x-auto">
          <DataTable value={reports} dataKey="id" paginator rows={20} rowsPerPageOptions={[20, 50, 100]} scrollable scrollHeight="560px" tableStyle={{ minWidth: "1000px" }} emptyMessage="Aucun rapport de génération enregistré.">
            <Column field="createdAt" header="Exécuté le" frozen sortable style={{ minWidth: "190px" }} body={(row: FinancialGenerationReport) => <strong>{formatDateTime(row.createdAt)}</strong>} />
            <Column header="Résultat" style={{ minWidth: "140px" }} body={(row: FinancialGenerationReport) => <Tag value={row.status === "success" ? "Succès" : row.status === "partial" ? "Partiel" : "Échec"} severity={row.status === "success" ? "success" : row.status === "partial" ? "warning" : "danger"} />} />
            <Column field="generated" header="Créés" sortable style={{ minWidth: "100px" }} />
            <Column field="regenerated" header="Régénérés" sortable style={{ minWidth: "120px" }} />
            <Column field="skippedPaid" header="Conservés" sortable style={{ minWidth: "115px" }} />
            <Column field="failed" header="Erreurs" sortable style={{ minWidth: "100px" }} body={(row: FinancialGenerationReport) => <span className={row.failed ? "font-semibold text-red-600" : "text-slate-700"}>{row.failed}</span>} />
            <Column header="Total traité" style={{ minWidth: "130px" }} body={(row: FinancialGenerationReport) => row.generated + row.regenerated + row.skippedPaid + row.failed} />
            <Column header="" style={{ minWidth: "150px" }} body={(row: FinancialGenerationReport) => <Button label="Voir le rapport" icon="pi pi-eye" size="small" text onClick={() => setReportDialog(row)} />} />
          </DataTable>
        </div>
      </section>}

      <Dialog header="Générer un dossier financier" visible={generationDialogOpen} modal className="w-[min(94vw,34rem)]" onHide={() => setGenerationDialogOpen(false)}><div className="space-y-4"><Dropdown value={enrollmentId} options={enrollmentOptions} filter className="w-full" placeholder="Sélectionner un élève inscrit" onChange={(event) => setEnrollmentId(event.value)} /><div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined onClick={() => setGenerationDialogOpen(false)} /><Button label="Générer" loading={generating} disabled={!enrollmentId} onClick={() => void handleGenerateUnit()} /></div></div></Dialog>
      <Dialog header="Générer et réappliquer les frais" visible={globalDialogOpen} modal className="w-[min(94vw,38rem)]" onHide={() => setGlobalDialogOpen(false)}><div className="space-y-4"><Message severity="info" text="Les dossiers absents seront créés. Les dossiers déjà payés seront conservés pour protéger l’historique financier." /><div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined onClick={() => setGlobalDialogOpen(false)} /><Button label="Lancer" icon="pi pi-refresh" loading={generating} onClick={() => void handleGenerateAll()} /></div></div></Dialog>
      <Dialog header="Rapport de génération" visible={Boolean(reportDialog)} modal maximizable className="w-[min(96vw,70rem)]" onHide={() => setReportDialog(undefined)}>{reportDialog ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-4">{[["Créés", reportDialog.generated], ["Régénérés", reportDialog.regenerated], ["Conservés", reportDialog.skippedPaid], ["Erreurs", reportDialog.failed]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 p-4"><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></div>)}</div>{reportDialog.errors.length ? <div className="max-w-full overflow-x-auto"><DataTable value={reportDialog.errors} dataKey="enrollmentId" paginator rows={10} tableStyle={{ minWidth: "900px" }}><Column field="studentName" header="Élève" /><Column field="levelName" header="Niveau" /><Column field="code" header="Code" /><Column field="message" header="Problème" /><Column field="hint" header="Correction attendue" /></DataTable></div> : <Message severity="success" text="Tous les dossiers ont été traités sans erreur." />}</div> : null}</Dialog>
    </div>
  );
}
