import type { ReactNode } from "react";

type WorkspaceProps = {
  header: ReactNode;
  children: ReactNode;
  feedback?: ReactNode;
  className?: string;
};

const joinClassNames = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

export function Workspace({
  header,
  children,
  feedback,
  className,
}: WorkspaceProps) {
  return (
    <section
      className={joinClassNames("w-full space-y-4 pb-8", className)}
    >
      {header}
      {feedback}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
