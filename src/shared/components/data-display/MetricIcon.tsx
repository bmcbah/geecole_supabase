type MetricIconProps = {
  icon: string;
  size?: "sm" | "md";
  tone?: "emerald" | "slate";
  className?: string;
};

const sizeClasses = {
  sm: "size-8 rounded-lg text-xs",
  md: "size-9 rounded-xl text-sm",
};

const toneClasses = {
  emerald: "bg-white text-emerald-600 ring-slate-200",
  slate: "bg-slate-50 text-slate-500 ring-slate-200",
};

export function MetricIcon({ icon, size = "sm", tone = "emerald", className = "" }: MetricIconProps) {
  return (
    <span className={`inline-grid shrink-0 place-items-center leading-none shadow-sm ring-1 ${sizeClasses[size]} ${toneClasses[tone]} ${className}`} aria-hidden="true">
      <i className={`pi ${icon} block leading-none`} />
    </span>
  );
}
