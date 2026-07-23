import type { ReactNode } from "react";

export function SmartFilterBar({ search, quickFilters, actions }: { search: ReactNode; quickFilters?: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-3 border-y border-slate-200 py-3">
      <div className="min-w-0 flex-1 lg:max-w-xl">{search}</div>
      {quickFilters ? <div className="hidden min-w-0 items-center gap-2 lg:flex">{quickFilters}</div> : null}
      <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}
