import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";

export type FilterOption = { label: string; value: string };

type Props = {
  search: string;
  onSearch: (value: string) => void;
  advanced: boolean;
  onAdvanced: () => void;
  onReset: () => void;
  activeCount: number;
  cycleId?: string;
  onCycle?: (value: string) => void;
  cycleOptions?: FilterOption[];
  levelId?: string;
  onLevel?: (value: string) => void;
  levelOptions?: FilterOption[];
  periodId?: string;
  onPeriod?: (value: string) => void;
  periodOptions?: FilterOption[];
  status?: string;
  onStatus?: (value: string) => void;
  statusOptions?: FilterOption[];
  classId?: string;
  onClass?: (value: string) => void;
  classOptions?: FilterOption[];
  dateFrom?: string;
  onDateFrom?: (value: string) => void;
  dateTo?: string;
  onDateTo?: (value: string) => void;
  placeholder?: string;
};

const controlClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function NotesDataTableToolbar(props: Props) {
  const cycleOptions = props.cycleOptions ?? [];
  const levelOptions = props.levelOptions ?? [];
  const periodOptions = props.periodOptions ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-950">
              Périmètre pédagogique
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Choisissez le cycle, le niveau et la période avant d’affiner la liste.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {props.activeCount > 0 ? (
              <Button
                label="Réinitialiser"
                icon="pi pi-filter-slash"
                severity="secondary"
                text
                size="small"
                onClick={props.onReset}
              />
            ) : null}
            <Button
              label={props.advanced ? "Masquer les filtres" : "Plus de filtres"}
              icon={props.advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"}
              severity="secondary"
              outlined
              size="small"
              badge={props.activeCount > 0 ? String(props.activeCount) : undefined}
              onClick={props.onAdvanced}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {props.onCycle ? (
            <label>
              <span className={labelClass}>Cycle</span>
              <Dropdown
                value={props.cycleId ?? ""}
                options={[{ label: "Tous les cycles", value: "" }, ...cycleOptions]}
                onChange={(event) => props.onCycle?.(String(event.value ?? ""))}
                className={controlClass}
              />
            </label>
          ) : null}
          {props.onLevel ? (
            <label>
              <span className={labelClass}>Niveau</span>
              <Dropdown
                value={props.levelId ?? ""}
                options={[{ label: "Tous les niveaux", value: "" }, ...levelOptions]}
                disabled={!props.cycleId}
                onChange={(event) => props.onLevel?.(String(event.value ?? ""))}
                className={controlClass}
              />
            </label>
          ) : null}
          {props.onPeriod ? (
            <label>
              <span className={labelClass}>Période</span>
              <Dropdown
                value={props.periodId ?? ""}
                options={[{ label: "Toutes les périodes", value: "" }, ...periodOptions]}
                onChange={(event) => props.onPeriod?.(String(event.value ?? ""))}
                className={controlClass}
              />
            </label>
          ) : null}
          <label>
            <span className={labelClass}>Rechercher</span>
            <span className="p-input-icon-left block w-full">
              <i className="pi pi-search left-3 text-sm text-slate-400" />
              <InputText
                value={props.search}
                onChange={(event) => props.onSearch(event.target.value)}
                className={`${controlClass} pl-9`}
                placeholder={props.placeholder ?? "Rechercher"}
              />
            </span>
          </label>
        </div>
      </div>

      {props.advanced ? (
        <div className="border-t border-emerald-100 bg-emerald-50/35 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="m-0 text-sm font-semibold text-slate-900">Filtres complémentaires</h3>
            <p className="mt-1 text-xs text-slate-500">
              Affinez la liste sans changer le périmètre pédagogique sélectionné.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {props.onClass ? (
              <label>
                <span className={labelClass}>Classe</span>
                <Dropdown
                  value={props.classId ?? ""}
                  options={[{ label: "Toutes les classes", value: "" }, ...(props.classOptions ?? [])]}
                  filter
                  onChange={(event) => props.onClass?.(String(event.value ?? ""))}
                  className={controlClass}
                />
              </label>
            ) : null}
            {props.onStatus ? (
              <label>
                <span className={labelClass}>Statut</span>
                <Dropdown
                  value={props.status ?? ""}
                  options={[{ label: "Tous les statuts", value: "" }, ...(props.statusOptions ?? [])]}
                  onChange={(event) => props.onStatus?.(String(event.value ?? ""))}
                  className={controlClass}
                />
              </label>
            ) : null}
            {props.onDateFrom ? (
              <label>
                <span className={labelClass}>Du</span>
                <InputText type="date" value={props.dateFrom ?? ""} onChange={(event) => props.onDateFrom?.(event.target.value)} className={controlClass} />
              </label>
            ) : null}
            {props.onDateTo ? (
              <label>
                <span className={labelClass}>Au</span>
                <InputText type="date" value={props.dateTo ?? ""} onChange={(event) => props.onDateTo?.(event.target.value)} className={controlClass} />
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
