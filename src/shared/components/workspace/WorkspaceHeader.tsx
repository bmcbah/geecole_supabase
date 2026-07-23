import type { ReactNode } from "react";

type WorkspaceHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
};

export function WorkspaceHeader({
  title,
  description,
  meta,
  actions,
  tabs,
}: WorkspaceHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              {title}
            </h1>
            {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {tabs ? <div>{tabs}</div> : null}
    </header>
  );
}
