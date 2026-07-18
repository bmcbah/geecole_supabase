import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { generateCode } from "../../utils/generate-code";

type CodeFieldProps = {
  id: string;
  value: string;
  source: string;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  buttonLabel?: string;
};

export function CodeField({
  id,
  value,
  source,
  invalid = false,
  disabled = false,
  onChange,
  buttonLabel = "Générer",
}: CodeFieldProps) {
  return (
    <div className="code-field-group">
      <InputText
        id={id}
        value={value}
        invalid={invalid}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <Button
        type="button"
        label={buttonLabel}
        icon="pi pi-bolt"
        outlined
        disabled={disabled || source.trim().length === 0}
        onClick={() => onChange(generateCode(source))}
      />
    </div>
  );
}
