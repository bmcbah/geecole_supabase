type DashboardKpiCardProps = {
  label: string;
  value: number | string;
  description: string;
  icon: string;
  onOpen: () => void;
};

export function DashboardKpiCard({
  label,
  value,
  description,
  icon,
  onOpen,
}: DashboardKpiCardProps) {
  return (
    <button
      type="button"
      className="group flex min-h-36 w-full flex-col justify-between rounded-md border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
      onClick={onOpen}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-50 text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
          <i className={`pi ${icon} text-sm`} />
        </span>
      </span>
      <strong className="mt-3 block text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </strong>
      <span className="mt-2 block text-xs leading-5 text-slate-500">
        {description}
      </span>
    </button>
  );
}
