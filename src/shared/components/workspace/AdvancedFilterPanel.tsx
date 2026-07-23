import type { ReactNode } from "react";

export function AdvancedFilterPanel({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="border-b border-slate-200 bg-slate-50/60 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
      {footer ? <div className="mt-4 flex justify-end">{footer}</div> : null}
    </section>
  );
}
