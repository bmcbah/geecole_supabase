import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import type { CatalogItem } from "../services/personnel.service";
import { createEmployeeSanction } from "../services/personnel.service";
export function EmployeeSanctionDialog({
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
    incident: new Date().toISOString().slice(0, 10),
    reason: "",
    description: "",
    decision: "",
    status: "draft" as "draft" | "notified",
  });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const set = (k: string, v: string) => setForm((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (!form.reason.trim()) throw new Error("Le motif est obligatoire.");
      await createEmployeeSanction({
        institution_id: institutionId,
        employee_id: employeeId,
        sanction_type_item_id: form.type,
        incident_on: form.incident,
        reason: form.reason,
        description: form.description,
        decision: form.decision,
        status: form.status,
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
      header="Enregistrer une sanction"
      visible={visible}
      onHide={onHide}
      className="w-[min(94vw,42rem)]"
    >
      <Message
        severity="warn"
        text="Ce dossier est confidentiel. Enregistrez uniquement des faits vérifiés et une décision formalisée."
        className="mb-4 w-full"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Dropdown
            value={form.type}
            showClear
            options={catalogs
              .filter((x) => x.category === "sanction_type" && x.is_active)
              .map((x) => ({
                value: x.id,
                label: x.local_label || x.default_label,
              }))}
            onChange={(e) => set("type", e.value || "")}
          />
        </Field>
        <Field label="Date de l’incident">
          <InputText
            type="date"
            value={form.incident}
            onChange={(e) => set("incident", e.target.value)}
          />
        </Field>
        <Field label="Motif *">
          <InputText
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        </Field>
        <Field label="État">
          <Dropdown
            value={form.status}
            options={[
              { label: "Brouillon", value: "draft" },
              { label: "Notifiée", value: "notified" },
            ]}
            onChange={(e) => set("status", e.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description factuelle">
            <InputTextarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Décision">
            <InputTextarea
              rows={2}
              value={form.decision}
              onChange={(e) => set("decision", e.target.value)}
            />
          </Field>
        </div>
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
        label="Enregistrer"
        icon="pi pi-check"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
