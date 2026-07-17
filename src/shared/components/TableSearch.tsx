import { InputText } from "primereact/inputtext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
export function TableSearch({
  value,
  onChange,
  placeholder = "Rechercher dans toutes les colonnes",
}: Props) {
  return (
    <div className="table-search-bar medium-controls">
      <label htmlFor="table-global-search">Recherche</label>
      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText
          id="table-global-search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      {value && (
        <button
          type="button"
          className="table-search-clear"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
        >
          <i className="pi pi-times" />
        </button>
      )}
    </div>
  );
}
