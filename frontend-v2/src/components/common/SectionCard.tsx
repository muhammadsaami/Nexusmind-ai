import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({ title, subtitle, action, children, className = '' }: SectionCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[0_16px_50px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:p-6 ${className}`.trim()}
    >
      {(title || subtitle || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </motion.section>
  );
}