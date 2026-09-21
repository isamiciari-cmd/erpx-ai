import { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  FileSpreadsheet,
  Printer,
  Search,
  Sparkles,
} from 'lucide-react';
import { downloadExcel, printReport, ReportRow } from '../../utils/reporting';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400/80">
          {eyebrow ?? 'ERPX-AI Workspace'}
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          {description}
        </p>
      </div>

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = 'primary',
  icon,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary:
      'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_10px_30px_rgba(34,211,238,.18)]',
    secondary:
      'bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1]',
    ghost: 'text-slate-300 hover:bg-white/[0.06]',
    danger:
      'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  delta?: string;
  icon: ReactNode;
  tone?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    cyan: 'from-cyan-400/20 to-cyan-400/0 text-cyan-300',
    violet: 'from-violet-400/20 to-violet-400/0 text-violet-300',
    emerald: 'from-emerald-400/20 to-emerald-400/0 text-emerald-300',
    amber: 'from-amber-400/20 to-amber-400/0 text-amber-300',
    rose: 'from-rose-400/20 to-rose-400/0 text-rose-300',
  };

  const positive = delta?.startsWith('+');

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/75 p-5 shadow-xl shadow-black/10">
      <div
        className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${tones[tone]}`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-white">{value}</div>

          {delta && (
            <div
              className={`mt-2 flex items-center gap-1 text-xs font-bold ${
                positive ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {positive ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
              {delta}
            </div>
          )}
        </div>

        <div
          className={`grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] ${
            tones[tone].split(' ').pop()
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-slate-900/70 shadow-xl shadow-black/10 backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
      <div>
        <h2 className="text-sm font-black text-white">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.06]"
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();

  const cls =
    s.includes('paid') ||
    s.includes('active') ||
    s.includes('confirmed') ||
    s.includes('received') ||
    s.includes('completed') ||
    s.includes('present')
      ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
      : s.includes('pending') ||
          s.includes('draft') ||
          s.includes('low') ||
          s.includes('transit')
        ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
        : 'bg-rose-400/10 text-rose-300 border-rose-400/20';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${cls}`}
    >
      {status}
    </span>
  );
}

export function ReportActions({
  title,
  rows,
  meta,
}: {
  title: string;
  rows: ReportRow[];
  meta?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        variant="secondary"
        icon={<FileSpreadsheet size={15} />}
        onClick={() =>
          downloadExcel(
            title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            rows,
          )
        }
      >
        Excel
      </ActionButton>

      <ActionButton
        variant="secondary"
        icon={<Printer size={15} />}
        onClick={() => printReport(title, rows, meta)}
      >
        PDF / Print
      </ActionButton>
    </div>
  );
}

export function AIInsight({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.09] to-violet-400/[0.04] p-5">
      <div className="flex items-center gap-2 text-cyan-300">
        <Sparkles size={16} />
        <span className="text-xs font-black uppercase tracking-wider">
          AI Insight
        </span>
      </div>

      <h3 className="mt-3 text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
    </div>
  );
}
