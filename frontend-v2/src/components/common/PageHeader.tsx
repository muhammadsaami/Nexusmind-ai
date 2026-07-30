interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
      {subtitle ? <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
    </div>
  );
}