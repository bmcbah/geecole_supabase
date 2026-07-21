import { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import type { CatalogItem } from "../services/personnel.service";
import { createPayrollAdjustment } from "../services/personnel.service";
export function PayrollAdjustmentDialog({
  visible,
  onHide,
  onSaved,
  institutionId,
  entryId,
  catalogs,
}: {
  visible: boolean;
  onHide: () => void;
  onSaved: () => Promise<void>;
  institutionId: string;
  entryId: string;
  catalogs: CatalogItem[];
}) {
  const [kind, setKind] = useState<"gain" | "deduction">("gain");
  const [item, setItem] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const options = useMemo(
    () =>
      catalogs
        .filter(
          (x) =>
            x.category ===
              (kind === "gain" ? "bonus_type" : "deduction_type") &&
            x.is_active,
        )
        .map((x) => ({ value: x.id, label: x.local_label || x.default_label })),
    [catalogs, kind],
  );
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (!label.trim() || amount <= 0)
        throw new Error("Le libellé et le montant sont obligatoires.");
      await createPayrollAdjustment({
        institution_id: institutionId,
        payroll_entry_id: entryId,
        kind,
        label,
        amount,
        catalog_item_id: item,
        notes,
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
      header="Ajouter une rubrique"
      visible={visible}
      onHide={onHide}
      className="personnel-form-dialog w-[min(94vw,38rem)]"
    >
      <div className="space-y-4">
        <Field label="Sens de la rubrique">
          <Dropdown
            value={kind}
            options={[
              { label: "Gain / prime", value: "gain" },
              { label: "Retenue", value: "deduction" },
            ]}
            onChange={(e) => {
              setKind(e.value);
              setItem("");
            }}
          />
        </Field>
        <Field label="Type">
          <Dropdown
            value={item}
            showClear
            options={options}
            onChange={(e) => {
              setItem(e.value || "");
              const found = options.find((x) => x.value === e.value);
              if (found) setLabel(found.label);
            }}
          />
        </Field>
        <Field label="Libellé affiché sur le bulletin *">
          <InputText value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Montant (GNF) *">
          <InputNumber
            value={amount}
            min={0}
            onValueChange={(e) => setAmount(e.value || 0)}
          />
        </Field>
        <Field label="Commentaire interne">
          <InputTextarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
        label="Ajouter au bulletin"
        icon="pi pi-plus"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
