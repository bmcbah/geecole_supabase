import { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import type { CompensationMode } from "../domain/personnel";
import type { CatalogItem } from "../services/personnel.service";
import { createEmployeeContract } from "../services/personnel.service";
const modes = [
  { label: "Salaire mensuel fixe", value: "fixed" },
  { label: "Taux horaire", value: "hourly" },
  { label: "Par séance", value: "session" },
  { label: "Forfait", value: "flat_rate" },
  { label: "Fixe + heures", value: "mixed" },
  { label: "Non rémunéré", value: "unpaid" },
];
export function EmployeeContractDialog({
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
  const [form, setForm] = useState({
    type: "",
    reference: "",
    starts: new Date().toISOString().slice(0, 10),
    ends: "",
    mode: "fixed" as CompensationMode,
    fixed: 0,
    hourly: 0,
    session: 0,
    weekly: 0,
    method: "",
    status: "draft" as "draft" | "active",
  });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const amountOk = useMemo(
    () =>
      form.mode === "unpaid" || form.mode === "hourly"
        ? form.hourly > 0
        : form.mode === "session"
          ? form.session > 0
          : form.fixed > 0,
    [form],
  );
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (!form.starts || !amountOk)
        throw new Error("Complétez la date et la rémunération du contrat.");
      await createEmployeeContract({
        institution_id: institutionId,
        employee_id: employeeId,
        contract_type_item_id: form.type,
        reference: form.reference,
        starts_on: form.starts,
        ends_on: form.ends,
        status: form.status,
        compensation_mode: form.mode,
        fixed_amount: form.fixed,
        hourly_rate: form.hourly,
        session_rate: form.session,
        weekly_hours: form.weekly,
        payment_method: form.method,
      });
      await onSaved();
      onHide();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };
  const set = (k: string, v: unknown) => setForm((x) => ({ ...x, [k]: v }));
  return (
    <Dialog
      header="Ajouter un contrat"
      visible={visible}
      onHide={onHide}
      className="w-[min(96vw,48rem)]"
    >
      <p className="mt-0 text-sm text-slate-500">
        Le contrat peut être préparé en brouillon puis activé après contrôle.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Type de contrat">
          <Dropdown
            value={form.type}
            showClear
            options={catalogs
              .filter((x) => x.category === "contract_type" && x.is_active)
              .map((x) => ({
                value: x.id,
                label: x.local_label || x.default_label,
              }))}
            onChange={(e) => set("type", e.value || "")}
          />
        </Field>
        <Field label="Référence">
          <InputText
            value={form.reference}
            onChange={(e) => set("reference", e.target.value)}
          />
        </Field>
        <Field label="Date de début *">
          <InputText
            type="date"
            value={form.starts}
            onChange={(e) => set("starts", e.target.value)}
          />
        </Field>
        <Field label="Date de fin">
          <InputText
            type="date"
            min={form.starts}
            value={form.ends}
            onChange={(e) => set("ends", e.target.value)}
          />
        </Field>
        <Field label="Mode de rémunération *">
          <Dropdown
            value={form.mode}
            options={modes}
            onChange={(e) => set("mode", e.value)}
          />
        </Field>
        <Field label="État initial">
          <Dropdown
            value={form.status}
            options={[
              { label: "Brouillon", value: "draft" },
              { label: "Actif", value: "active" },
            ]}
            onChange={(e) => set("status", e.value)}
          />
        </Field>
        {["fixed", "flat_rate", "mixed"].includes(form.mode) && (
          <Field label="Montant fixe (GNF) *">
            <InputNumber
              value={form.fixed}
              min={0}
              onValueChange={(e) => set("fixed", e.value || 0)}
            />
          </Field>
        )}
        {["hourly", "mixed"].includes(form.mode) && (
          <Field label="Taux horaire (GNF) *">
            <InputNumber
              value={form.hourly}
              min={0}
              onValueChange={(e) => set("hourly", e.value || 0)}
            />
          </Field>
        )}
        {form.mode === "session" && (
          <Field label="Taux par séance (GNF) *">
            <InputNumber
              value={form.session}
              min={0}
              onValueChange={(e) => set("session", e.value || 0)}
            />
          </Field>
        )}
        <Field label="Heures hebdomadaires prévues">
          <InputNumber
            value={form.weekly}
            min={0}
            max={168}
            onValueChange={(e) => set("weekly", e.value || 0)}
          />
        </Field>
        <Field label="Mode de paiement">
          <Dropdown
            value={form.method}
            showClear
            options={[
              "Espèces",
              "Virement bancaire",
              "Chèque",
              "Mobile money",
            ].map((x) => ({ label: x, value: x.toLowerCase() }))}
            onChange={(e) => set("method", e.value || "")}
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
        label="Enregistrer le contrat"
        icon="pi pi-check"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
