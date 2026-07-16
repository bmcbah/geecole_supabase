import { useEffect } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import {
  structureItemSchema,
  type StructureItemInput,
} from "../schemas/academic-structure.schema";
import { generateCode } from "../../../shared/utils/generate-code";

interface Props {
  kind: "cycle" | "niveau";
  visible: boolean;
  loading: boolean;
  initial?: StructureItemInput;
  onHide: () => void;
  onSubmit: (input: StructureItemInput) => Promise<void>;
}
const defaults: StructureItemInput = {
  name: "",
  code: "",
  sortOrder: 0,
  isActive: true,
  periodSystem: "term",
  periodCount: 3,
  subjectsPeriodScope: "all",
  gradingScale: 20,
  passAverage: 10,
  rankingEnabled: true,
  absencesOnReport: true,
  capacity: null,
  repeatAllowed: true,
};
export function StructureItemDialog({
  kind,
  visible,
  loading,
  initial,
  onHide,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<StructureItemInput>({
    resolver: zodResolver(structureItemSchema),
    defaultValues: defaults,
  });
  useEffect(() => {
    if (visible) reset(initial ?? defaults);
  }, [initial, reset, visible]);
  const submit = handleSubmit(onSubmit);
  return (
    <Dialog
      header={`${initial ? "Modifier" : "Ajouter"} un ${kind}`}
      visible={visible}
      modal
      className="form-dialog"
      onHide={onHide}
    >
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="structure-name">Nom</label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <InputText
                {...field}
                id="structure-name"
                invalid={Boolean(errors.name)}
              />
            )}
          />
          {errors.name && (
            <small className="p-error">{errors.name.message}</small>
          )}
        </div>
        {kind === "cycle" && (
          <div className="settings-grid compact-grid">
            <div className="field">
              <label htmlFor="period-system">Organisation de l’année</label>
              <Controller
                name="periodSystem"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    inputId="period-system"
                    value={field.value}
                    options={[
                      { label: "Trimestres", value: "term" },
                      { label: "Semestres", value: "semester" },
                      { label: "Personnalisée", value: "custom" },
                    ]}
                    onChange={(event) => field.onChange(event.value)}
                  />
                )}
              />
            </div>
            <div className="field">
              <label htmlFor="period-count">Nombre de périodes</label>
              <Controller
                name="periodCount"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    inputId="period-count"
                    value={field.value}
                    min={1}
                    max={6}
                    onValueChange={(event) => field.onChange(event.value)}
                  />
                )}
              />
            </div>
            <div className="field">
              <label htmlFor="subject-period-scope">Matières par période</label>
              <Controller
                name="subjectsPeriodScope"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    inputId="subject-period-scope"
                    value={field.value}
                    options={[
                      {
                        label: "Identiques pour toutes les périodes",
                        value: "all",
                      },
                      {
                        label: "Périodes sélectionnables",
                        value: "selectable",
                      },
                    ]}
                    onChange={(event) => field.onChange(event.value)}
                  />
                )}
              />
            </div>
            <NumberField
              name="gradingScale"
              label="Barème par défaut"
              control={control}
            />
            <NumberField
              name="passAverage"
              label="Moyenne de passage"
              control={control}
            />
          </div>
        )}
        {kind === "niveau" && (
          <NumberField
            name="capacity"
            label="Capacité indicative"
            control={control}
          />
        )}
        <div className="field">
          <label htmlFor="structure-code">Code</label>
          <div className="input-with-action">
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <InputText
                  {...field}
                  id="structure-code"
                  onChange={(event) =>
                    field.onChange(event.target.value.toUpperCase())
                  }
                  invalid={Boolean(errors.code)}
                />
              )}
            />
            <Button
              type="button"
              label="Générer"
              icon="pi pi-bolt"
              outlined
              onClick={() =>
                setValue("code", generateCode(getValues("name")), {
                  shouldValidate: true,
                })
              }
            />
          </div>
          {errors.code && (
            <small className="p-error">{errors.code.message}</small>
          )}
        </div>
        <div className="field">
          <label htmlFor="structure-order">Ordre d’affichage</label>
          <Controller
            name="sortOrder"
            control={control}
            render={({ field }) => (
              <InputNumber
                inputId="structure-order"
                value={field.value}
                onValueChange={(event) => field.onChange(event.value)}
                min={0}
                max={999}
              />
            )}
          />
        </div>
        <div className="checkbox-field">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Checkbox
                inputId="structure-active"
                checked={field.value}
                onChange={(event) => field.onChange(event.checked)}
              />
            )}
          />
          <label htmlFor="structure-active">Actif</label>
        </div>
        {kind === "cycle" && (
          <>
            <BooleanField
              name="rankingEnabled"
              label="Afficher le classement"
              control={control}
            />
            <BooleanField
              name="absencesOnReport"
              label="Afficher les absences au bulletin"
              control={control}
            />
          </>
        )}
        {kind === "niveau" && (
          <BooleanField
            name="repeatAllowed"
            label="Redoublement autorisé"
            control={control}
          />
        )}
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
            label="Enregistrer"
            icon="pi pi-check"
            loading={loading}
          />
        </div>
      </form>
    </Dialog>
  );
}

function NumberField({
  name,
  label,
  control,
}: {
  name: "gradingScale" | "passAverage" | "capacity";
  label: string;
  control: Control<StructureItemInput>;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <InputNumber
            inputId={name}
            value={field.value ?? null}
            onValueChange={(event) => field.onChange(event.value ?? null)}
            min={0}
          />
        )}
      />
    </div>
  );
}
function BooleanField({
  name,
  label,
  control,
}: {
  name: "rankingEnabled" | "absencesOnReport" | "repeatAllowed";
  label: string;
  control: Control<StructureItemInput>;
}) {
  return (
    <div className="checkbox-field">
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Checkbox
            inputId={name}
            checked={Boolean(field.value)}
            onChange={(event) => field.onChange(event.checked)}
          />
        )}
      />
      <label htmlFor={name}>{label}</label>
    </div>
  );
}
