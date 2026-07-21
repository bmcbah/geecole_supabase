import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { CatalogItem } from "../services/personnel.service";
import {
  createPersonnelCatalogItem,
  listPersonnelCatalog,
  updatePersonnelCatalogItem,
} from "../services/personnel.service";
const names: Record<string, string> = {
  function: "Fonctions",
  contract_type: "Types de contrat",
  work_type: "Types d’activité",
  bonus_type: "Types de prime",
  deduction_type: "Types de retenue",
  advance_type: "Types d’avance",
  leave_type: "Congés et absences",
  sanction_type: "Types de sanction",
};
export function PersonnelCatalogsPage() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [category, setCategory] = useState("function");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem>();
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    async () => setItems(await listPersonnelCatalog(institutionId)),
    [institutionId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          x.category === category &&
          `${x.default_label} ${x.local_label || ""} ${x.code}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, category, query],
  );
  const active = items.filter(
    (x) => x.category === category && x.is_active,
  ).length;
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
        summary: editing ? "Libellé mis à jour" : "Valeur ajoutée",
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
        title="Paramétrage du personnel"
        description="Activez le catalogue GeEcole, adaptez les libellés locaux et ajoutez les valeurs propres à l’établissement."
        actions={
          <Button
            label="Ajouter une valeur"
            icon="pi pi-plus"
            onClick={showAdd}
          />
        }
      />
      <section className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Catalogues
          </div>
          {Object.entries(names).map(([key, name]) => {
            const count = items.filter(
              (x) => x.category === key && x.is_active,
            ).length;
            return (
              <button
                key={key}
                type="button"
                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${category === key ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => {
                  setCategory(key);
                  setQuery("");
                }}
              >
                <span>{name}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">
                  {count}
                </span>
              </button>
            );
          })}
        </aside>
        <div className="min-w-0 space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Rechercher dans {names[category].toLowerCase()}
                </span>
                <span className="p-input-icon-left block">
                  <i className="pi pi-search" />
                  <InputText
                    className="w-full"
                    value={query}
                    placeholder="Libellé ou code"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </span>
              </label>
              <div className="text-sm text-slate-500">
                <strong className="text-slate-900">{active}</strong> valeur(s)
                active(s)
              </div>
            </div>
          </section>
          <SettingsTablePanel
            sectionHeader={
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-900">
                  {names[category]}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Les valeurs GeEcole restent disponibles même lorsqu’elles sont
                  désactivées.
                </p>
              </div>
            }
            dataTable={
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <DataTable
                  value={filtered}
                  dataKey="id"
                  stripedRows
                  emptyMessage="Aucune valeur dans ce catalogue"
                >
                  <Column
                    header="Libellé"
                    body={(x: CatalogItem) => (
                      <div>
                        <strong className="block text-sm text-slate-900">
                          {x.local_label || x.default_label}
                        </strong>
                        {x.local_label && (
                          <small className="text-slate-400">
                            GeEcole : {x.default_label}
                          </small>
                        )}
                      </div>
                    )}
                  />
                  <Column
                    field="code"
                    header="Code"
                    body={(x: CatalogItem) => (
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs">
                        {x.code}
                      </code>
                    )}
                  />
                  <Column
                    header="Origine"
                    body={(x: CatalogItem) => (
                      <Tag
                        value={x.is_system ? "GeEcole" : "Établissement"}
                        severity={x.is_system ? "info" : "secondary"}
                      />
                    )}
                  />
                  <Column
                    header="Actif"
                    body={(x: CatalogItem) => (
                      <div className="flex items-center gap-2">
                        <InputSwitch
                          checked={x.is_active}
                          onChange={() => void toggle(x)}
                        />
                        <span className="text-xs text-slate-500">
                          {x.is_active ? "Oui" : "Non"}
                        </span>
                      </div>
                    )}
                  />
                  <Column
                    header=""
                    body={(x: CatalogItem) => (
                      <Button
                        label="Renommer"
                        icon="pi pi-pencil"
                        size="small"
                        text
                        onClick={() => showEdit(x)}
                      />
                    )}
                  />
                </DataTable>
              </div>
            }
          />
        </div>
      </section>
      <Dialog
        header={editing ? "Adapter le libellé" : "Ajouter une valeur locale"}
        visible={open}
        modal
        className="w-[min(96vw,36rem)]"
        onHide={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium">Catalogue</span>
            <Dropdown
              className="w-full"
              value={editing?.category || category}
              disabled={Boolean(editing)}
              options={Object.entries(names).map(([value, label]) => ({
                value,
                label,
              }))}
              onChange={(e) => setCategory(e.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Libellé *</span>
            <InputText
              className="w-full"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          {!editing && (
            <label>
              <span className="mb-1 block text-sm font-medium">Code</span>
              <InputText
                className="w-full"
                value={code}
                placeholder="Généré depuis le libellé si vide"
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}
          {editing?.is_system && (
            <p className="m-0 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              La valeur GeEcole n’est pas modifiée : seul son libellé dans cet
              établissement change.
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
