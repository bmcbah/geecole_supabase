import type { ReactNode } from "react";
import { Panel } from "./Panel";

type TablePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  toolbar?: ReactNode;
  alerts?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function TablePanel({
  title,
  description,
  meta,
  toolbar,
  alerts,
  children,
  className = "",
}: TablePanelProps) {
  return (
    <Panel
      title={title}
      description={description}
      meta={meta}
      actions={toolbar}
      alerts={alerts}
      className={className}
    >
      {children}
    </Panel>
  );
}
