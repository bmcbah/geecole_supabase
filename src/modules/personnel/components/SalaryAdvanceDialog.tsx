import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import type { CatalogItem } from "../services/personnel.service";
import { createSalaryAdvance } from "../services/personnel.service";
export function SalaryAdvanceDialog({
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
  const [type, setType] = useState("");
  const [amount, setAmount] = useState(0);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (amount <= 0)
        throw new Error("Le montant doit être supérieur à zéro.");
      await createSalaryAdvance({
        institution_id: institutionId,
        employee_id: employeeId,
        advance_type_item_id: type,
        amount_requested: amount,
        requested_on: day,
        reason,
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
      header="Nouvelle demande d’avance"
      visible={visible}
      onHide={onHide}
      className="w-[min(94vw,38rem)]"
    >
      <div className="space-y-4">
        <Field label="Type d’avance">
          <Dropdown
            value={type}
            showClear
            options={catalogs
              .filter((x) => x.category === "advance_type" && x.is_active)
              .map((x) => ({
                value: x.id,
                label: x.local_label || x.default_label,
              }))}
            onChange={(e) => setType(e.value || "")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Montant demandé (GNF) *">
            <InputNumber
              value={amount}
              min={0}
              onValueChange={(e) => setAmount(e.value || 0)}
            />
          </Field>
          <Field label="Date de demande">
            <InputText
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Motif">
          <InputTextarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
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
        label="Enregistrer la demande"
        icon="pi pi-check"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
