import { useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import type { CatalogItem } from "../services/personnel.service";
import { createEmployeeFunction } from "../services/personnel.service";
export function EmployeeFunctionDialog({
  visible,
  onHide,
  onSaved,
  institutionId,
  employeeId,
  catalogs,
}: {
  visible: boolean;
  onHide: () => void;
  onSaved: () => Promise<void>;
  institutionId: string;
  employeeId: string;
  catalogs: CatalogItem[];
}) {
  const [item, setItem] = useState("");
  const [responsibility, setResponsibility] = useState("");
  const [starts, setStarts] = useState(new Date().toISOString().slice(0, 10));
  const [primary, setPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (!item) throw new Error("Sélectionnez une fonction.");
      await createEmployeeFunction({
        institution_id: institutionId,
        employee_id: employeeId,
        function_item_id: item,
        is_primary: primary,
        responsibility,
        starts_on: starts,
      });
      await onSaved();
      onHide();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      header="Ajouter une fonction"
      visible={visible}
      onHide={onHide}
      className="w-[min(94vw,34rem)]"
    >
      <div className="space-y-4">
        <Field label="Fonction *">
          <Dropdown
            value={item}
            options={catalogs
              .filter((x) => x.category === "function" && x.is_active)
              .map((x) => ({
                value: x.id,
                label: x.local_label || x.default_label,
              }))}
            onChange={(e) => setItem(e.value)}
            placeholder="Choisir une fonction"
            filter
          />
        </Field>
        <Field label="Responsabilité complémentaire">
          <InputText
            value={responsibility}
            onChange={(e) => setResponsibility(e.target.value)}
          />
        </Field>
        <Field label="Date de début">
          <InputText
            type="date"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            checked={primary}
            onChange={(e) => setPrimary(Boolean(e.checked))}
          />
          <span>Définir comme fonction principale</span>
        </label>
      </div>
      {failure && (
        <Message severity="error" text={failure} className="mt-4 w-full" />
      )}
      <Actions onHide={onHide} busy={busy} save={save} />
    </Dialog>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Actions({
  onHide,
  busy,
  save,
}: {
  onHide: () => void;
  busy: boolean;
  save: () => Promise<void>;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
      <Button label="Annuler" text severity="secondary" onClick={onHide} />
      <Button
        label="Ajouter"
        icon="pi pi-plus"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
