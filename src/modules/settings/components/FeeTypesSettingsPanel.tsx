import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  archiveFeeType,
  listFeeTypes,
  saveFeeType,
  type FeeType,
} from "../services/school-fees.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";

export function FeeTypesSettingsPanel() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [editing, setEditing] = useState<FeeType | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFeeTypes(await listFeeTypes(institutionId));
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      description: editing?.description ?? "",
      is_active: editing?.is_active ?? true,
    }),
    [editing],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    setSaving(true);
    try {
      await saveFeeType(
        institutionId,
        {
          name: String(values.name),
          code: String(values.code),
          description: String(values.description || "") || null,
          is_active: Boolean(values.is_active),
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Catégorie de frais enregistrée" });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Catégories de frais"
            description="Définissez les frais réutilisables d’une année scolaire à l’autre."
            meta={<Tag value={`${feeTypes.length} catégorie${feeTypes.length > 1 ? "s" : ""}`} severity="secondary" />}
            headingAs="h2"
            compact
          />
        }
        toolbar={
          <Toolbar
            start={<span className="text-xs text-slate-500">Ce référentiel appartient à l’établissement.</span>}
            end={<Button label="Nouvelle catégorie" icon="pi pi-plus" size="small" onClick={() => setEditing(null)} />}
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable value={feeTypes} dataKey="id" size="small" stripedRows emptyMessage="Aucune catégorie de frais">
            <Column field="name" header="Catégorie" />
            <Column field="code" header="Code" />
            <Column header="Statut" body={(row: FeeType) => <Tag value={row.is_active ? "Actif" : "Inactif"} severity={row.is_active ? "success" : "secondary"} />} />
            <Column
              header="Actions"
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: FeeType) => (
                <div className="flex justify-end gap-1">
                  <Button icon="pi pi-pencil" text size="small" onClick={() => setEditing(row)} />
                  <Button icon="pi pi-archive" text size="small" severity="danger" onClick={() => void archiveFeeType(row.id).then(load)} />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <SettingsEntityDialog
        header="Catégorie de frais"
        visible={editing !== undefined}
        loading={saving}
        columns={2}
        fields={[
          { key: "name", label: "Libellé", required: true },
          { key: "code", label: "Code", required: true },
          { key: "description", label: "Description", type: "textarea", span: 2 },
          { key: "is_active", label: "Catégorie active", type: "boolean", span: 2 },
        ] as EntityField[]}
        initial={initial}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </>
  );
}
