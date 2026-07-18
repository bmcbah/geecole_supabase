import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import { financialAccountStatusLabels, type FinancialAccount } from "../domain/financial-account";
import {
  listFinancialAccountsPage,
  reapplyAllFinancialAccounts,
} from "../services/financial-accounts.service";

const formatAmount = (value: number, currency = "GNF") => `${Number(value).toLocaleString("fr-GN")} ${currency}`;

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

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setFailure("");
    try {
      const result = await listFinancialAccountsPage(institutionId, year.id, {
        first,
        rows,
        search,
        sortField,
        sortOrder,
      });
      setAccounts(result.rows);
      setTotalRecords(result.total);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger les dossiers financiers.");
    } finally {
      setLoading(false);
    }
  }, [first, institutionId, rows, search, sortField, sortOrder, year]);

  useEffect(() => { void load(); }, [load]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(String(event.sortField ?? "studentName"));
    setSortOrder(event.sortOrder === -1 ? -1 : 1);
  };

  const generateGlobal = async () => {
    if (!year) return;
    setGenerating(true);
    try {
      const result = await reapplyAllFinancialAccounts(institutionId, year.id);
      setConfirmGlobal(false);
      await load();
      notify({
        severity: result.failed ? "warn" : "success",
        summary: "Génération globale terminée",
        detail: `${result.generated} créés, ${result.regenerated} régénérés, ${result.skippedPaid} conservés car déjà payés, ${result.failed} erreur(s).`,
      });
    } catch (cause) {
      notify({ severity: "error", summary: "Génération impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally {
      setGenerating(false);
    }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dossiers financiers"
        description="Liste paginée côté serveur des dossiers financiers de l’année scolaire."
        meta={<Tag value={`${totalRecords} dossier${totalRecords > 1 ? "s" : ""}`} severity="secondary" />}
        actions={<Button label="Générer / réappliquer les frais" icon="pi pi-refresh" onClick={() => setConfirmGlobal(true)} />}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <span className="p-input-icon-left block max-w-xl">
          <i className="pi pi-search" />
          <InputText
            value={search}
            className="w-full"
            placeholder="Élève, matricule ou niveau"
            onChange={(event) => { setFirst(0); setSearch(event.target.value); }}
          />
        </span>
      </div>

      <SettingsTablePanel
        alert={failure ? <Message severity="error" text={failure} /> : undefined}
        dataTable={
          <DataTable
            value={accounts}
            loading={loading}
            lazy
            paginator
            first={first}
            rows={rows}
            totalRecords={totalRecords}
            rowsPerPageOptions={[10, 25, 50]}
            sortField={sortField}
            sortOrder={sortOrder}
            onPage={onPage}
            onSort={onSort}
            dataKey="id"
            stripedRows
            selectionMode="single"
            onRowClick={(event) => navigate(`/gestion-financiere/dossiers/${event.data.id}`)}
            rowClassName={() => "cursor-pointer"}
            emptyMessage="Aucun dossier financier"
          >
            <Column field="studentName" header="Élève" sortable />
            <Column field="matricule" header="Matricule" sortable />
            <Column field="levelName" header="Niveau" sortable />
            <Column header="Montant net" body={(row: FinancialAccount) => formatAmount(row.totalAmount, row.currencyCode)} sortable sortField="totalAmount" />
            <Column header="Payé" body={(row: FinancialAccount) => formatAmount(row.paidAmount, row.currencyCode)} sortable sortField="paidAmount" />
            <Column header="Reste" body={(row: FinancialAccount) => <strong>{formatAmount(row.balanceAmount, row.currencyCode)}</strong>} sortable sortField="balanceAmount" />
            <Column header="Statut" body={(row: FinancialAccount) => <Tag value={financialAccountStatusLabels[row.status]} severity={row.balanceAmount > 0 ? "info" : "success"} />} sortable sortField="status" />
            <Column header="" body={() => <i className="pi pi-chevron-right text-slate-400" />} />
          </DataTable>
        }
      />

      <Dialog header="Générer et réappliquer les frais" visible={confirmGlobal} modal className="w-[min(94vw,38rem)]" onHide={() => setConfirmGlobal(false)}>
        <div className="space-y-4">
          <Message severity="info" text="Les dossiers absents seront créés. Les dossiers sans paiement seront régénérés selon la grille actuelle. Les dossiers ayant déjà un encaissement seront conservés pour ne pas modifier l’historique financier." />
          <div className="flex justify-end gap-2">
            <Button label="Annuler" severity="secondary" outlined onClick={() => setConfirmGlobal(false)} />
            <Button label="Lancer la génération" icon="pi pi-refresh" loading={generating} onClick={() => void generateGlobal()} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
