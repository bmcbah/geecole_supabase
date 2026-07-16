import { Dropdown } from "primereact/dropdown";
import type { Institution } from "../../institutions/types/institution";

interface Props {
  institutions: Institution[];
  value: string;
  onChange: (id: string) => void;
}
export function InstitutionSelector({ institutions, value, onChange }: Props) {
  if (institutions.length < 2) return null;
  return (
    <div className="institution-selector">
      <label htmlFor="institution">Établissement</label>
      <Dropdown
        inputId="institution"
        value={value}
        options={institutions}
        optionLabel="name"
        optionValue="id"
        onChange={(event) => onChange(event.value as string)}
      />
    </div>
  );
}
