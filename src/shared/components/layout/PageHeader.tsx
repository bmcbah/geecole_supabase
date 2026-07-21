import type { ElementType, ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  backAction?: ReactNode;
  headingAs?: "h1" | "h2" | "h3";
  compact?: boolean;
  divided?: boolean;
  className?: string;
};

const joinClassNames = (...classNames: Array<string | number | false | null | undefined>) =>
  classNames.filter(Boolean).join(" ");

export function PageHeader({
  title,
  eyebrow,
  description,
  meta,
  actions,
  leading,
  backAction,
  headingAs = "h1",
  compact = false,
  divided = true,
  className,
}: PageHeaderProps) {
  const Heading = headingAs as ElementType;

  return (
    <header
      className={joinClassNames(
        divided && "border-b border-slate-200",
        compact ? "pb-3" : "pb-4",
        className,
      )}
    >
      {backAction ? <div className="mb-2">{backAction}</div> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {leading ? <div className="shrink-0">{leading}</div> : null}

          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
                {eyebrow}
              </div>
            ) : null}

            <div
              className={joinClassNames(
                eyebrow && "mt-1",
                "flex flex-wrap items-center gap-2 p-0",
              )}
            >
              <Heading
                className={joinClassNames(
                  " font-bold tracking-tight text-slate-900 m-0",
                  compact ? "text-lg leading-6" : "text-xl sm:text-2xl",
                )}
              >
                {title}
              </Heading>

              {meta ? (
                <div className="flex flex-wrap items-center gap-1.5">{meta}</div>
              ) : null}
            </div>

            {description ? (
              <div
                className={joinClassNames(
                  "max-w-3xl text-slate-600",
                  compact ? "mt-0 text-xs leading-5" : "mt-1 text-sm leading-5",
                )}
              >
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
