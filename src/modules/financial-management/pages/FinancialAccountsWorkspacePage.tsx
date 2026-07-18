import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { financialAccountStatusLabels, type FinancialAccount } from "../domain/financial-account";
import {
  listFinancialAccountsPage,
  reapplyAllFinancialAccounts,
  type FinancialGenerationError,
  type FinancialGenerationResult,
} from "../services/financial-accounts.service";

const formatAmount = (value: number, currency = "GNF") => `${Number(value).toLocaleString("fr-GN")} ${currency}`;
const controlClass = "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

const logGenerationResult = (result: FinancialGenerationResult) => {
  const summary = { generated: result.generated, regenerated: result.regenerated, skippedPaid: result.skippedPaid, failed: result.failed };
  if (result.failed > 0) {
    console.groupCollapsed(`[Finance] Génération globale terminée avec ${result.failed} erreur(s)`);
    console.info("Résumé", summary);
    console.table(result.errors.map((error) => ({ student: error.studentName, matricule: error.matricule ?? "", enrollmentId: error.enrollmentId, code: error.code, message: error.message })));
    result.errors.forEach((error, index) => console.error(`[Finance] Erreur ${index + 1}`, error));
    console.groupEnd();
    return;
  }
  console.info("[Finance] Génération globale terminée", summary);
};

export function FinancialAccountsWorkspacePage() {
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, year } = useAcademicSession();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [sortField, setSortField] = useState("studentName");
  const [sortOrder, setSortOrder] = useState<1 | -1>(1);
  const [confirmGlobal, setConfirmGlobal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<FinancialGenerationResult>();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setFailure("");
    try {
      const result = await listFinancialAccountsPage(institutionId, year.id, { first, rows, search, sortField, sortOrder });
      setAccounts(result.rows);
      setTotalRecords(result.total);
    } catch (cause) {
      console.error("[Finance] Impossible de charger les dossiers financiers", cause);
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger les dossiers financiers.");
    } finally {
      setLoading(false);
    }
  }, [first, institutionId, rows, search, sortField, sortOrder, year]);

  useEffect(() => { void load(); }, [load]);

  const pageStats = useMemo(() => {
    const total = accounts.reduce((sum, account) => sum + account.totalAmount, 0);
    const paid = accounts.reduce((sum, account) => sum + account.paidAmount, 0);
    const balance = accounts.reduce((sum, account) => sum + account.balanceAmount, 0);
    const settled = accounts.filter((account) => account.balanceAmount <= 0).length;
    return { total, paid, balance, settled };
  }, [accounts]);

  const onPage = (event: DataTablePageEvent) => { setFirst(event.first); setRows(event.rows); };
  const onSort = (event: DataTableSortEvent) => { setFirst(0); setSortField(String(event.sortField ?? "studentName")); setSortOrder(event.sortOrder === -1 ? -1 : 1); };

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

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const statCards = [
    { label: "Montant appelé", value: formatAmount(pageStats.total), hint: "Sur la page affichée", icon: "pi-file" },
    { label: "Déjà encaissé", value: formatAmount(pageStats.paid), hint: "Paiements comptabilisés", icon: "pi-wallet" },
    { label: "Reste à payer", value: formatAmount(pageStats.balance), hint: "Solde des dossiers visibles", icon: "pi-chart-line" },
    { label: "Dossiers soldés", value: String(pageStats.settled), hint: `${accounts.length} dossier${accounts.length > 1 ? "s" : ""} sur cette page`, icon: "pi-check-circle" },
  ];

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Dossiers financiers"
        description={`Suivez les frais, encaissements et soldes des élèves pour ${year.name}.`}
        meta={<div className="flex items-center gap-2 text-sm text-slate-500"><MetricIcon icon="pi-wallet" /><strong className="font-semibold text-slate-900">{totalRecords}</strong><span>dossier{totalRecords > 1 ? "s" : ""}</span></div>}
        actions={<Button label="Générer / réappliquer" icon="pi pi-refresh" className="h-10 rounded-xl bg-emerald-600 px-3 text-sm shadow-none hover:bg-emerald-700" onClick={() => setConfirmGlobal(true)} />}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold text-slate-950">Vue financière</h2><p className="mt-1 text-sm text-slate-500">Synthèse des dossiers actuellement affichés.</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{year.name}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</span><MetricIcon icon={card.icon} /></div>
              <strong className="mt-4 block text-xl font-bold tracking-tight text-slate-950">{card.value}</strong>
              <span className="mt-1 block text-xs text-slate-500">{card.hint}</span>
            </article>
          ))}
        </div>
      </section>

      {failure ? <Message severity="error" text={failure} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4">
          <label className="block max-w-2xl">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher un dossier</span>
            <span className="p-input-icon-left block w-full"><i className="pi pi-search left-3 text-sm text-slate-400" /><InputText value={search} className={`${controlClass} pl-9`} placeholder="Élève, matricule ou niveau" onChange={(event) => { setFirst(0); setSearch(event.target.value); }} /></span>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid min-h-[360px] place-items-center"><div className="text-center"><ProgressSpinner className="size-10" strokeWidth="4" /><p className="mt-3 text-sm font-medium text-slate-500">Chargement des dossiers…</p></div></div>
        ) : accounts.length === 0 ? (
          <div className="grid min-h-[360px] place-items-center p-8 text-center"><div className="max-w-sm"><MetricIcon icon="pi-wallet" size="md" tone="slate" className="mx-auto" /><h3 className="mt-4 text-sm font-semibold text-slate-900">Aucun dossier financier</h3><p className="mt-1 text-sm leading-6 text-slate-500">Modifiez la recherche ou générez les frais de l’année scolaire.</p></div></div>
        ) : (
          <DataTable value={accounts} lazy paginator first={first} rows={rows} totalRecords={totalRecords} rowsPerPageOptions={[10, 25, 50]} sortField={sortField} sortOrder={sortOrder} onPage={onPage} onSort={onSort} dataKey="id" stripedRows selectionMode="single" onRowClick={(event) => navigate(`/gestion-financiere/dossiers/${event.data.id}`)} rowClassName={() => "cursor-pointer"} className="text-sm" tableStyle={{ minWidth: "1100px" }}>
            <Column field="studentName" header="Élève" sortable body={(row: FinancialAccount) => <div><strong className="block text-sm text-slate-900">{row.studentName}</strong><span className="text-xs text-slate-400">{row.matricule}</span></div>} />
            <Column field="levelName" header="Niveau" sortable body={(row: FinancialAccount) => <div><span className="block text-sm text-slate-700">{row.levelName}</span><span className="text-xs text-slate-400">{row.cycleName}</span></div>} />
            <Column header="Montant net" body={(row: FinancialAccount) => <strong className="text-slate-950">{formatAmount(row.totalAmount, row.currencyCode)}</strong>} sortable sortField="totalAmount" />
            <Column header="Payé" body={(row: FinancialAccount) => <span className="font-semibold text-emerald-700">{formatAmount(row.paidAmount, row.currencyCode)}</span>} sortable sortField="paidAmount" />
            <Column header="Reste" body={(row: FinancialAccount) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{formatAmount(row.balanceAmount, row.currencyCode)}</strong>} sortable sortField="balanceAmount" />
            <Column header="Statut" body={(row: FinancialAccount) => <Tag value={financialAccountStatusLabels[row.status]} severity={row.balanceAmount > 0 ? "warning" : "success"} />} sortable sortField="status" />
            <Column header="" body={() => <i className="pi pi-chevron-right text-slate-400" />} />
          </DataTable>
        )}
      </section>

      <Dialog header="Générer et réappliquer les frais" visible={confirmGlobal} modal className="w-[min(94vw,38rem)]" onHide={() => setConfirmGlobal(false)}>
        <div className="space-y-4"><Message severity="info" text="Les dossiers absents seront créés. Les dossiers sans paiement seront régénérés selon la grille actuelle. Les dossiers ayant déjà un encaissement seront conservés pour ne pas modifier l’historique financier." /><div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined disabled={generating} onClick={() => setConfirmGlobal(false)} /><Button label="Lancer la génération" icon="pi pi-refresh" loading={generating} onClick={() => void generateGlobal()} /></div></div>
      </Dialog>

      <Dialog header="Rapport de génération" visible={Boolean(generationResult)} modal maximizable className="w-[min(96vw,70rem)]" onHide={() => setGenerationResult(undefined)}>
        {generationResult ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Créés", generationResult.generated], ["Régénérés", generationResult.regenerated], ["Conservés", generationResult.skippedPaid], ["Erreurs", generationResult.failed],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-2 text-2xl font-bold ${label === "Erreurs" ? "text-red-600" : "text-slate-950"}`}>{value}</div></div>)}</div>{generationResult.errors.length ? <><Message severity="error" text="Certains dossiers n’ont pas pu être générés. Consultez chaque ligne pour connaître la cause exacte." /><DataTable value={generationResult.errors} dataKey="enrollmentId" paginator rows={10} rowsPerPageOptions={[10, 25, 50]} stripedRows emptyMessage="Aucune erreur détaillée retournée."><Column field="studentName" header="Élève" /><Column field="matricule" header="Matricule" /><Column field="levelName" header="Niveau" /><Column field="code" header="Code" body={(error: FinancialGenerationError) => <Tag value={error.code || "INCONNU"} severity="danger" />} /><Column field="message" header="Message" /><Column header="Détail" body={(error: FinancialGenerationError) => <div className="max-w-xl space-y-1 text-sm">{error.detail ? <div><strong>Détail :</strong> {error.detail}</div> : null}{error.hint ? <div><strong>Indication :</strong> {error.hint}</div> : null}{!error.detail && !error.hint ? <span className="text-slate-500">Aucun détail complémentaire</span> : null}</div>} /></DataTable></> : <Message severity="success" text="Tous les dossiers ont été traités sans erreur." />}<div className="flex justify-end"><Button label="Fermer" onClick={() => setGenerationResult(undefined)} /></div></div> : null}
      </Dialog>
    </div>
  );
}
