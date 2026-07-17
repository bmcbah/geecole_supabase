import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import {
  academicYearSchema,
  type AcademicYearInput,
} from "../schemas/settings.schema";
import type { AcademicYear } from "../types/settings";

interface Props {
  visible: boolean;
  loading: boolean;
  years: AcademicYear[];
  onHide: () => void;
  onSubmit: (input: AcademicYearInput) => Promise<void>;
}
const defaults = {
  name: "",
  startsOn: undefined,
  endsOn: undefined,
  sourceYearId: undefined,
} as unknown as AcademicYearInput;

export function AcademicYearDialog({
  visible,
  loading,
  years,
  onHide,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: defaults,
  });
  useEffect(() => {
    if (!visible) reset(defaults);
  }, [visible, reset]);
  const submit = handleSubmit(onSubmit);
  return (
    <Dialog
      header="Nouvelle année scolaire"
      visible={visible}
      modal
      className="form-dialog"
      onHide={onHide}
    >
      <form
        className="form-stack"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <div className="field">
          <label htmlFor="year-name">Libellé</label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <InputText
                {...field}
                id="year-name"
                placeholder="2026-2027"
                invalid={Boolean(errors.name)}
              />
            )}
          />
          {errors.name && (
            <small className="p-error">{errors.name.message}</small>
          )}
        </div>
        <div className="field">
          <label htmlFor="starts-on">Date de début</label>
          <Controller
            name="startsOn"
            control={control}
            render={({ field }) => (
              <Calendar
                inputId="starts-on"
                value={field.value}
                onChange={(event) => field.onChange(event.value)}
                dateFormat="dd/mm/yy"
                showIcon
                invalid={Boolean(errors.startsOn)}
              />
            )}
          />
          {errors.startsOn && (
            <small className="p-error">{errors.startsOn.message}</small>
          )}
        </div>
        <div className="field">
          <label htmlFor="ends-on">Date de fin</label>
          <Controller
            name="endsOn"
            control={control}
            render={({ field }) => (
              <Calendar
                inputId="ends-on"
                value={field.value}
                onChange={(event) => field.onChange(event.value)}
                dateFormat="dd/mm/yy"
                showIcon
                invalid={Boolean(errors.endsOn)}
              />
            )}
          />
          {errors.endsOn && (
            <small className="p-error">{errors.endsOn.message}</small>
          )}
        </div>
        <div className="field">
          <label htmlFor="source-year">Reprendre la structure de</label>
          <Controller
            name="sourceYearId"
            control={control}
            render={({ field }) => (
              <Dropdown
                inputId="source-year"
                value={field.value}
                options={years}
                optionLabel="name"
                optionValue="id"
                placeholder="Partir d’une structure vide"
                showClear
                onChange={(event) => field.onChange(event.value)}
              />
            )}
          />
          <small>
            Copie uniquement les cycles et niveaux activés. Aucun élève, note ou
            paiement n’est copié.
          </small>
        </div>
        <div className="dialog-actions">
          <Button
            type="button"
            label="Annuler"
            severity="secondary"
            outlined
            onClick={onHide}
          />
          <Button
            type="submit"
            label="Créer en préparation"
            icon="pi pi-check"
            loading={loading}
          />
        </div>
      </form>
    </Dialog>
  );
}
