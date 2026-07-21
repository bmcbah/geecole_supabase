import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import type { Employee } from "../domain/personnel";
import { updateEmployee } from "../services/personnel.service";
import {
  isPastOrToday,
  isValidEmail,
  isValidGuineaPhone,
} from "../utils/personnel-validation";

export function EmployeeEditDialog({
  employee,
  visible,
  onHide,
  onSaved,
}: {
  employee: Employee;
  visible: boolean;
  onHide: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(employee);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    if (visible) {
      setForm(employee);
      setFailure("");
    }
  }, [employee, visible]);
  const set = (key: keyof Employee, value: unknown) =>
    setForm((v) => ({ ...v, [key]: value }));
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (!form.first_name.trim() || !form.last_name.trim())
        throw new Error("Le prénom et le nom sont obligatoires.");
      if (!isPastOrToday(form.birth_date || ""))
        throw new Error("La date de naissance ne peut pas être future.");
      if (
        ![form.phone, form.secondary_phone, form.emergency_contact_phone].every(
          (value) => isValidGuineaPhone(value || ""),
        )
      )
        throw new Error(
          "Vérifiez les numéros : format attendu 6XX XX XX XX ou +224 6XX XX XX XX.",
        );
      if (!isValidEmail(form.email || ""))
        throw new Error("L’adresse e-mail n’est pas valide.");
      await updateEmployee(employee.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        birth_date: form.birth_date || null,
        birth_place: form.birth_place,
        nationality: form.nationality,
        phone: form.phone,
        secondary_phone: form.secondary_phone,
        email: form.email,
        address: form.address,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        identity_type: form.identity_type,
        identity_number: form.identity_number,
        identity_expires_on: form.identity_expires_on || null,
        notes: form.notes,
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
      header="Modifier la fiche Personnel"
      visible={visible}
      onHide={onHide}
      className="personnel-form-dialog w-[min(96vw,56rem)]"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Prénoms *">
          <InputText
            value={form.first_name}
            onChange={(e) => set("first_name", e.target.value)}
          />
        </Field>
        <Field label="Nom *">
          <InputText
            value={form.last_name}
            onChange={(e) => set("last_name", e.target.value)}
          />
        </Field>
        <Field label="Sexe">
          <Dropdown
            value={form.gender}
            showClear
            options={[
              { label: "Masculin", value: "male" },
              { label: "Féminin", value: "female" },
              { label: "Autre", value: "other" },
            ]}
            onChange={(e) => set("gender", e.value || null)}
          />
        </Field>
        <Field label="Date de naissance">
          <InputText
            type="date"
            value={form.birth_date || ""}
            onChange={(e) => set("birth_date", e.target.value)}
          />
        </Field>
        <Field label="Lieu de naissance">
          <InputText
            value={form.birth_place || ""}
            onChange={(e) => set("birth_place", e.target.value)}
          />
        </Field>
        <Field label="Nationalité">
          <InputText
            value={form.nationality || ""}
            onChange={(e) => set("nationality", e.target.value)}
          />
        </Field>
        <Field label="Téléphone">
          <InputText
            value={form.phone || ""}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label="Téléphone secondaire">
          <InputText
            value={form.secondary_phone || ""}
            onChange={(e) => set("secondary_phone", e.target.value)}
          />
        </Field>
        <Field label="E-mail">
          <InputText
            type="email"
            value={form.email || ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Adresse">
          <InputText
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <Field label="Contact d’urgence">
          <InputText
            value={form.emergency_contact_name || ""}
            onChange={(e) => set("emergency_contact_name", e.target.value)}
          />
        </Field>
        <Field label="Téléphone d’urgence">
          <InputText
            value={form.emergency_contact_phone || ""}
            onChange={(e) => set("emergency_contact_phone", e.target.value)}
          />
        </Field>
        <Field label="Type de pièce">
          <InputText
            value={form.identity_type || ""}
            onChange={(e) => set("identity_type", e.target.value)}
          />
        </Field>
        <Field label="Numéro de pièce">
          <InputText
            value={form.identity_number || ""}
            onChange={(e) => set("identity_number", e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <InputTextarea
            rows={2}
            value={form.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
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
        label="Enregistrer"
        icon="pi pi-check"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
