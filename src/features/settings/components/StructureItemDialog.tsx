import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
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
