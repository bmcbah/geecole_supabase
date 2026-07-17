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
    <header className={`border-b border-slate-200 pb-4 ${className}`.trim()}>
      {backAction && <div className="mb-2">{backAction}</div>}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {leading && <div className="shrink-0">{leading}</div>}

          <div className="min-w-0">
            {eyebrow && (
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
                {eyebrow}
              </div>
            )}

            <div
              className={`${eyebrow ? "mt-1" : ""} flex flex-wrap items-center gap-2`}
            >
              <h1 className="min-w-0 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {meta && (
                <div className="flex flex-wrap items-center gap-1.5">{meta}</div>
              )}
            </div>

            {description && (
              <div className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-600">
                {description}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
