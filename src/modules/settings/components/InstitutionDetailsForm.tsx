import { useEffect } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import type { Institution } from "../../institutions/types/institution";
import { useToast } from "../../../shared/components/toast-context";
import {
  institutionSettingsSchema,
  type InstitutionSettingsInput,
} from "../schemas/settings.schema";
import { updateInstitution } from "../services/settings.service";

interface Props {
  institution: Institution;
  onUpdated: (institution: Institution) => void;
}
const currencies = [{ label: "Franc guinéen (GNF)", value: "GNF" }];
const timezones = [
  { label: "Conakry (Africa/Conakry)", value: "Africa/Conakry" },
];
const locales = [{ label: "Français — Guinée", value: "fr-GN" }];

export function InstitutionDetailsForm({ institution, onUpdated }: Props) {
  const notify = useToast();
  const values = toFormValues(institution);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<InstitutionSettingsInput>({
    resolver: zodResolver(institutionSettingsSchema),
    defaultValues: values,
  });
  useEffect(() => reset(toFormValues(institution)), [institution, reset]);
  const submit = handleSubmit(async (input) => {
    try {
      const updated = await updateInstitution(institution.id, input);
      onUpdated(updated);
      reset(toFormValues(updated));
      notify({ severity: "success", summary: "Paramètres enregistrés" });
    } catch {
      notify({ severity: "error", summary: "Enregistrement impossible" });
    }
  });
  return (
    <>
      <form
        className="settings-grid"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <Field
          name="name"
          label="Nom"
          control={control}
          error={errors.name?.message}
        />
        <Field
          name="phone"
          label="Téléphone"
          control={control}
          error={errors.phone?.message}
        />
        <Field
          name="email"
          label="E-mail"
          control={control}
          error={errors.email?.message}
        />
        <Field
          name="address"
          label="Adresse"
          control={control}
          error={errors.address?.message}
        />
        <SelectField
          name="currency"
          label="Devise"
          control={control}
          options={currencies}
        />
        <SelectField
          name="timezone"
          label="Fuseau horaire"
          control={control}
          options={timezones}
        />
        <SelectField
          name="locale"
          label="Langue et format"
          control={control}
          options={locales}
        />
        <div className="form-actions">
          <Button
            type="submit"
            label="Enregistrer"
            icon="pi pi-save"
            loading={isSubmitting}
            disabled={!isDirty}
          />
        </div>
      </form>
    </>
  );
}

function toFormValues(institution: Institution): InstitutionSettingsInput {
  return {
    name: institution.name,
    phone: institution.phone ?? "",
    email: institution.email ?? "",
    address: institution.address ?? "",
    currency: institution.currency,
    timezone: institution.timezone,
    locale: institution.locale,
  };
}
function Field({
  name,
  label,
  control,
  error,
}: {
  name: keyof InstitutionSettingsInput;
  label: string;
  control: Control<InstitutionSettingsInput>;
  error?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <InputText
            {...field}
            id={name}
            value={field.value}
            invalid={Boolean(error)}
          />
        )}
      />
      {error && <small className="p-error">{error}</small>}
    </div>
  );
}
function SelectField({
  name,
  label,
  control,
  options,
}: {
  name: "currency" | "timezone" | "locale";
  label: string;
  control: Control<InstitutionSettingsInput>;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Dropdown {...field} inputId={name} options={options} />
        )}
      />
    </div>
  );
}
