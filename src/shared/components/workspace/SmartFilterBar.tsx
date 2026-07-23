import type { ReactNode } from "react";

type SmartFilterBarProps = {
  primary: ReactNode;
  actions: ReactNode;
  advanced?: ReactNode;
};

export function SmartFilterBar({ primary, actions, advanced }: SmartFilterBarProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex min-w-0 items-end gap-3">
          <div className="min-w-0 flex-1">{primary}</div>
          <div className="ml-auto flex shrink-0 items-center justify-end gap-2">{actions}</div>
        </div>
      </div>
      {advanced ? <div className="border-t border-emerald-100 bg-emerald-50/35 p-4">{advanced}</div> : null}
    </section>
  );
}
