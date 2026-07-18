import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { MultiSelect } from "primereact/multiselect";
import { CodeField } from "../../../shared/components/forms/CodeField";

export type EntityValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined;

export interface EntityField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "select" | "multiselect";
  required?: boolean;
  options?: { label: string; value: string }[];
  suffix?: string;
  span?: 1 | 2;
  visibleWhen?: (values: Record<string, EntityValue>) => boolean;
  resetOnChange?: string[];
}

interface Props {
  header: string;
  visible: boolean;
  loading: boolean;
  fields: EntityField[];
  initial: Record<string, EntityValue>;
  onHide: () => void;
  onSubmit: (values: Record<string, EntityValue>) => Promise<void>;
  columns?: 1 | 2;
}

export function SettingsEntityDialog({
  header,
  visible,
  loading,
  fields,
  initial,
  onHide,
  onSubmit,
  columns = 1,
}: Props) {
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setValues(initial);
      setSubmitted(false);
    }
  }, [initial, visible]);

  const visibleFields = useMemo(
    () => fields.filter((field) => field.visibleWhen?.(values) ?? true),
    [fields, values],
  );

  const invalid = (field: EntityField) => {
    if (!field.required) return false;
    const value = values[field.key];
    return (
      value === "" ||
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0)
    );
  };

  const numberValue = (key: string) => {
    const value = values[key];
    return typeof value === "number" ? value : null;
  };

  const updateValue = (field: EntityField, value: EntityValue) => {
    setValues((current) => {
      const next = { ...current, [field.key]: value };
      field.resetOnChange?.forEach((key) => {
        next[key] = [];
      });
      return next;
    });
  };

  const submit = () => {
    setSubmitted(true);
    if (visibleFields.some(invalid)) return;
    void onSubmit(values);
  };

  return (
    <Dialog
      header={header}
      visible={visible}
      modal
      className={columns === 2 ? "form-dialog form-dialog-wide" : "form-dialog"}
      onHide={onHide}
    >
      <div className={columns === 2 ? "form-grid" : "form-stack"}>
        {visibleFields.map((field) => (
          <div
            className={`${field.type === "boolean" ? "checkbox-field" : "field"}${
              columns === 2 && field.span === 2 ? " field-wide" : ""
            }`}
            key={field.key}
          >
            {field.type === "boolean" ? (
              <>
                <Checkbox
                  inputId={field.key}
                  checked={Boolean(values[field.key])}
                  onChange={(event) =>
                    updateValue(field, Boolean(event.checked))
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
                    invalid={submitted && invalid(field)}
                    onChange={(event) =>
                      updateValue(field, event.value as string[])
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
                      updateValue(field, event.value as EntityValue)
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
                      updateValue(field, event.value ?? null)
                    }
                  />
                ) : field.type === "textarea" ? (
                  <InputTextarea
                    id={field.key}
                    value={String(values[field.key] ?? "")}
                    rows={4}
                    invalid={submitted && invalid(field)}
                    onChange={(event) =>
                      updateValue(field, event.target.value)
                    }
                  />
                ) : field.key === "code" ? (
                  <CodeField
                    id={field.key}
                    value={String(values[field.key] ?? "")}
                    source={String(values.name ?? "")}
                    invalid={submitted && invalid(field)}
                    onChange={(value) => updateValue(field, value)}
                  />
                ) : (
                  <InputText
                    id={field.key}
                    value={String(values[field.key] ?? "")}
                    invalid={submitted && invalid(field)}
                    onChange={(event) =>
                      updateValue(field, event.target.value)
                    }
                  />
                )}
                {submitted && invalid(field) && (
                  <small className="p-error">Ce champ est obligatoire.</small>
                )}
              </>
            )}
          </div>
        ))}
        <div className={`dialog-actions${columns === 2 ? " field-wide" : ""}`}>
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
