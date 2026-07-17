import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  backAction?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  eyebrow,
  description,
  meta,
  actions,
  leading,
  backAction,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`border-b border-slate-200 pb-6 ${className}`.trim()}
    >
      {backAction && <div className="mb-4">{backAction}</div>}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          {leading && <div className="shrink-0">{leading}</div>}

          <div className="min-w-0">
            {eyebrow && (
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-600">
                {eyebrow}
              </div>
            )}

            <div className={`${eyebrow ? "mt-2" : ""} flex flex-wrap items-center gap-3`}>
              <h1 className="min-w-0 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
              {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
            </div>

            {description && (
              <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {description}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
