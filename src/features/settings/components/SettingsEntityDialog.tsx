import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { MultiSelect } from "primereact/multiselect";
import { generateCode } from "../../../shared/utils/generate-code";

export type EntityValue =
  string | number | boolean | string[] | null | undefined;
export interface EntityField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "select" | "multiselect";
  required?: boolean;
  options?: { label: string; value: string }[];
  suffix?: string;
}
interface Props {
  header: string;
  visible: boolean;
  loading: boolean;
  fields: EntityField[];
  initial: Record<string, EntityValue>;
  onHide: () => void;
  onSubmit: (values: Record<string, EntityValue>) => Promise<void>;
}

export function SettingsEntityDialog({
  header,
  visible,
  loading,
  fields,
  initial,
  onHide,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (visible) {
      setValues(initial);
      setSubmitted(false);
    }
  }, [initial, visible]);
  const invalid = (field: EntityField) =>
    field.required &&
    (values[field.key] === "" ||
      values[field.key] === null ||
      values[field.key] === undefined);
  const numberValue = (key: string) => {
    const value = values[key];
    return typeof value === "number" ? value : null;
  };
  const submit = () => {
    setSubmitted(true);
    if (fields.some(invalid)) return;
    void onSubmit(values);
  };
  return (
    <Dialog
      header={header}
      visible={visible}
      modal
      className="form-dialog"
      onHide={onHide}
    >
      <div className="form-stack">
        {fields.map((field) => (
          <div
            className={field.type === "boolean" ? "checkbox-field" : "field"}
            key={field.key}
          >
            {field.type === "boolean" ? (
              <>
                <Checkbox
                  inputId={field.key}
                  checked={Boolean(values[field.key])}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: Boolean(event.checked),
                    }))
                  }
                />
                <label htmlFor={field.key}>{field.label}</label>
              </>
            ) : (
              <>
                <label htmlFor={field.key}>{field.label}</label>
                {field.type === "multiselect" ? (
                  <MultiSelect
                    inputId={field.key}
                    value={
                      Array.isArray(values[field.key]) ? values[field.key] : []
                    }
                    options={field.options}
                    optionLabel="label"
                    optionValue="value"
                    display="chip"
                    filter
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.value as string[],
                      }))
                    }
                  />
                ) : field.type === "select" ? (
                  <Dropdown
                    inputId={field.key}
                    value={values[field.key]}
                    options={field.options}
                    optionLabel="label"
                    optionValue="value"
                    invalid={submitted && invalid(field)}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.value as EntityValue,
                      }))
                    }
                  />
                ) : field.type === "number" ? (
                  <InputNumber
                    inputId={field.key}
                    value={numberValue(field.key)}
                    suffix={field.suffix}
                    minFractionDigits={0}
                    maxFractionDigits={2}
                    invalid={submitted && invalid(field)}
                    onValueChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.value ?? null,
                      }))
                    }
                  />
                ) : field.type === "textarea" ? (
                  <InputTextarea
                    id={field.key}
                    value={String(values[field.key] ?? "")}
                    rows={4}
                    invalid={submitted && invalid(field)}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="input-with-action">
                    <InputText
                      id={field.key}
                      value={String(values[field.key] ?? "")}
                      invalid={submitted && invalid(field)}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                    {field.key === "code" && (
                      <Button
                        type="button"
                        label="Générer"
                        icon="pi pi-bolt"
                        outlined
                        onClick={() =>
                          setValues((current) => ({
                            ...current,
                            code: generateCode(String(current.name ?? "")),
                          }))
                        }
                      />
                    )}
                  </div>
                )}
                {submitted && invalid(field) && (
                  <small className="p-error">Ce champ est obligatoire.</small>
                )}
              </>
            )}
          </div>
        ))}
        <div className="dialog-actions">
          <Button
            label="Annuler"
            severity="secondary"
            outlined
            onClick={onHide}
          />
          <Button
            label="Enregistrer"
            icon="pi pi-check"
            loading={loading}
            onClick={submit}
          />
        </div>
      </div>
    </Dialog>
  );
}
