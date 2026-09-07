type Section = "market" | "jobs" | "community";

/**
 * Section pages no longer render a left navigation rail (site nav moved into
 * the top bar). This wrapper now only centers the page content.
 */
export async function SectionShell({
  section,
  children,
}: {
  section: Section;
  children: React.ReactNode;
}) {
  void section;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="min-w-0">{children}</div>
    </div>
  );
}
