import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { CatalogItem } from "../services/personnel.service";
import {
  createPersonnelCatalogItem,
  installPersonnelCatalog,
  listPersonnelCatalog,
  updatePersonnelCatalogItem,
} from "../services/personnel.service";

type Props = {
  category: string;
  title: string;
  description: string;
  addLabel: string;
  singularLabel: string;
};

export function PersonnelCatalogSettings({
  category,
  title,
  description,
  addLabel,
  singularLabel,
}: Props) {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem>();
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    async () =>
      setItems(
        (await listPersonnelCatalog(institutionId)).filter(
          (item) => item.category === category,
        ),
      ),
    [category, institutionId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.default_label} ${item.local_label || ""} ${item.code}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const showAdd = () => {
    setEditing(undefined);
    setLabel("");
    setCode("");
    setOpen(true);
  };
  const showEdit = (item: CatalogItem) => {
    setEditing(item);
    setLabel(item.local_label || item.default_label);
    setCode(item.code);
    setOpen(true);
  };
  const toggle = async (item: CatalogItem) => {
    try {
      await updatePersonnelCatalogItem(item.id, {
        is_active: !item.is_active,
        local_label: item.local_label,
      });
      await load();
    } catch (error) {
      notify({
        severity: "error",
        summary: "Modification impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    }
  };
  const installCatalog = async () => {
    setSaving(true);
    try {
      const installed = await installPersonnelCatalog(institutionId);
      await load();
      notify({
        severity: "success",
        summary: "Catalogue GeEcole chargé",
        detail:
          installed > 0
            ? `${installed} valeur(s) ajoutée(s).`
            : "Le catalogue est déjà à jour.",
      });
    } catch {
      notify({
        severity: "error",
        summary: "Chargement du catalogue impossible",
      });
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      if (editing)
        await updatePersonnelCatalogItem(editing.id, {
          is_active: editing.is_active,
          local_label:
            label.trim() === editing.default_label ? null : label.trim(),
        });
      else
        await createPersonnelCatalogItem({
          institution_id: institutionId,
          category,
          code: code || label,
          default_label: label.trim(),
        });
      setOpen(false);
      await load();
      notify({
        severity: "success",
        summary: editing ? "Libellé mis à jour" : `${singularLabel} ajouté(e)`,
      });
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
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow="Paramétrage · Personnel"
        title={title}
        description={description}
        actions={
          <div className="flex gap-2">
            <Button
              label="Catalogue GeEcole"
              icon="pi pi-download"
              severity="secondary"
              outlined
              loading={saving}
              onClick={() => void installCatalog()}
            />
            <Button label={addLabel} icon="pi pi-plus" onClick={showAdd} />
          </div>
        }
      />
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="w-full sm:max-w-md">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Rechercher
            </span>
            <span className="p-input-icon-left block">
              <i className="pi pi-search" />
              <InputText
                className="w-full"
                value={query}
                placeholder="Libellé ou code"
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          <span className="text-sm text-slate-500">
            <strong className="text-slate-900">
              {items.filter((item) => item.is_active).length}
            </strong>{" "}
            actif(s) sur {items.length}
          </span>
        </div>
        <DataTable
          value={filtered}
          dataKey="id"
          stripedRows
          emptyMessage={`Aucun ${singularLabel.toLowerCase()} configuré`}
        >
          <Column
            header="Libellé"
            body={(item: CatalogItem) => (
              <div>
                <strong className="block text-sm text-slate-900">
                  {item.local_label || item.default_label}
                </strong>
                {item.local_label && (
                  <small className="text-slate-400">
                    GeEcole : {item.default_label}
                  </small>
                )}
              </div>
            )}
          />
          <Column
            field="code"
            header="Code"
            body={(item: CatalogItem) => (
              <code className="rounded bg-slate-100 px-2 py-1 text-xs">
                {item.code}
              </code>
            )}
          />
          <Column
            header="Origine"
            body={(item: CatalogItem) => (
              <Tag
                value={item.is_system ? "GeEcole" : "Établissement"}
                severity={item.is_system ? "info" : "secondary"}
              />
            )}
          />
          <Column
            header="Actif"
            body={(item: CatalogItem) => (
              <div className="flex items-center gap-2">
                <InputSwitch
                  checked={item.is_active}
                  onChange={() => void toggle(item)}
                />
                <span className="text-xs text-slate-500">
                  {item.is_active ? "Oui" : "Non"}
                </span>
              </div>
            )}
          />
          <Column
            header=""
            body={(item: CatalogItem) => (
              <Button
                label="Renommer"
                icon="pi pi-pencil"
                size="small"
                text
                onClick={() => showEdit(item)}
              />
            )}
          />
        </DataTable>
      </section>
      <Dialog
        header={editing ? `Renommer : ${editing.default_label}` : addLabel}
        visible={open}
        modal
        className="personnel-form-dialog w-[min(96vw,36rem)]"
        onHide={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium">Libellé *</span>
            <InputText
              className="w-full"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          {!editing && (
            <label>
              <span className="mb-1 block text-sm font-medium">Code</span>
              <InputText
                className="w-full"
                value={code}
                placeholder="Généré depuis le libellé si vide"
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
          )}
          {editing?.is_system && (
            <p className="m-0 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              La valeur GeEcole reste intacte. Seul le libellé affiché par cet
              établissement est adapté.
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            outlined
            severity="secondary"
            onClick={() => setOpen(false)}
          />
          <Button
            label="Enregistrer"
            icon="pi pi-check"
            loading={saving}
            disabled={!label.trim()}
            onClick={() => void save()}
          />
        </div>
      </Dialog>
    </div>
  );
}
