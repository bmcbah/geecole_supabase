import type { ReactNode } from "react";

type DashboardGridProps = {
  children: ReactNode;
  className?: string;
};

type DashboardGridItemProps = {
  children: ReactNode;
  span?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
};

const spanClasses: Record<NonNullable<DashboardGridItemProps["span"]>, string> = {
  1: "xl:col-span-1",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
  4: "xl:col-span-4",
  5: "xl:col-span-5",
  6: "xl:col-span-6",
};

const joinClassNames = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div
      className={joinClassNames(
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardGridItem({
  children,
  span = 1,
  className,
}: DashboardGridItemProps) {
  return (
    <div
      className={joinClassNames(
        "min-w-0 md:col-span-1",
        spanClasses[span],
        className,
      )}
    >
      {children}
    </div>
  );
}
