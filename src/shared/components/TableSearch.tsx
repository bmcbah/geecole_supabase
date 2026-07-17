import { InputText } from "primereact/inputtext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function TableSearch({
  value,
  onChange,
  placeholder = "Rechercher",
  id = "table-global-search",
}: Props) {
  return (
    <div className="relative w-full min-w-56 sm:w-72">
      <span className="p-input-icon-left block w-full">
        <i className="pi pi-search" />
        <InputText
          id={id}
          value={value}
          placeholder={placeholder}
          className="w-full"
          aria-label="Rechercher dans le tableau"
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      {value && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
        >
          <i className="pi pi-times text-xs" />
        </button>
      )}
    </div>
  );
}
