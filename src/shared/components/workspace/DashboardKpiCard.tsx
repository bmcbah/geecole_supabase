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
      className="group flex min-h-32 w-full min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 text-[11px] font-semibold uppercase leading-4 tracking-[0.06em] text-slate-500">
          {label}
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-slate-50 text-slate-500 transition group-hover:bg-brand-50 group-hover:text-brand-700">
          <i className={`pi ${icon} text-xs`} />
        </span>
      </span>
      <strong className="mt-3 block text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </strong>
      <span className="mt-auto block pt-2 text-[11px] leading-4 text-slate-500">
        {description}
      </span>
    </button>
  );
}
