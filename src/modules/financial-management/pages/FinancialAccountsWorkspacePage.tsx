import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialAccountStatusLabels,
  type FinancialAccount,
} from "../domain/financial-account";
import {
  generateFinancialAccount,
  listConfirmedEnrollmentsWithoutFinancialAccount,
  listFinancialAccounts,
} from "../services/financial-accounts.service";

const formatAmount = (value: number, currency = "GNF") =>
  `${Number(value).toLocaleString("fr-GN")} ${currency}`;

export function FinancialAccountsWorkspacePage() {
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, year } = useAcademicSession();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setFailure("");
    try {
      const [nextAccounts, nextEnrollments] = await Promise.all([
        listFinancialAccounts(institutionId, year.id),
        listConfirmedEnrollmentsWithoutFinancialAccount(institutionId, year.id),
      ]);
      setAccounts(nextAccounts);
      setEnrollments(nextEnrollments);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger les dossiers financiers.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, year]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => accounts.reduce((result, account) => ({
    total: result.total + account.totalAmount,
    paid: result.paid + account.paidAmount,
    balance: result.balance + account.balanceAmount,
  }), { total: 0, paid: 0, balance: 0 }), [accounts]);

  const enrollmentOptions = enrollments.map((enrollment) => {
    const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
    return {
      value: enrollment.id,
      label: `${student?.first_name ?? ""} ${student?.last_name ?? ""} — ${enrollment.level_name_snapshot}`.trim(),
    };
  });

  const generate = async () => {
    if (!enrollmentId) return;
    setSaving(true);
    try {
      const accountId = await generateFinancialAccount(enrollmentId);
      setDialogOpen(false);
      setEnrollmentId(undefined);
      notify({ severity: "success", summary: "Dossier financier généré" });
      navigate(`/gestion-financiere/dossiers/${accountId}`);
    } catch (cause) {
      notify({ severity: "error", summary: "Génération impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dossiers financiers"
        description="Ouvrez un élève pour comprendre ses frais, ses échéances, ses avantages et ses encaissements."
        meta={<div className="flex flex-wrap gap-2"><Tag value={`${accounts.length} dossiers`} severity="secondary" /><Tag value={`Encaissé ${formatAmount(totals.paid)}`} severity="success" /><Tag value={`Reste ${formatAmount(totals.balance)}`} severity={totals.balance > 0 ? "warning" : "success"} /></div>}
        actions={<Button label="Générer un dossier" icon="pi pi-plus" disabled={!enrollments.length} onClick={() => setDialogOpen(true)} />}
      />

      <SettingsTablePanel
        alert={failure ? <Message severity="error" text={failure} /> : undefined}
        dataTable={
          <DataTable
            value={accounts}
            loading={loading}
            dataKey="id"
            stripedRows
            paginator={accounts.length > 10}
            rows={10}
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
            <Column header="Statut" body={(row: FinancialAccount) => <Tag value={financialAccountStatusLabels[row.status]} severity={row.balanceAmount > 0 ? "info" : "success"} />} />
            <Column header="" body={() => <i className="pi pi-chevron-right text-slate-400" />} />
          </DataTable>
        }
      />

      <Dialog header="Générer un dossier financier" visible={dialogOpen} modal className="form-dialog form-dialog-wide" onHide={() => setDialogOpen(false)}>
        <div className="form-grid">
          <div className="field field-wide"><label htmlFor="enrollment">Inscription confirmée</label><Dropdown inputId="enrollment" value={enrollmentId} options={enrollmentOptions} optionLabel="label" optionValue="value" filter className="w-full" placeholder="Sélectionner un élève" onChange={(event) => setEnrollmentId(event.value)} /></div>
          <div className="dialog-actions field-wide"><Button label="Annuler" severity="secondary" outlined onClick={() => setDialogOpen(false)} /><Button label="Générer" icon="pi pi-check" loading={saving} disabled={!enrollmentId} onClick={() => void generate()} /></div>
        </div>
      </Dialog>
    </div>
  );
}
