import { Check, Lock, Clock, RotateCw, Circle } from 'lucide-react';

export type ModuleStatus =
  | 'done'
  | 'in_progress'
  | 'pending'
  | 'locked'
  | 'needs_refresh'
  | 'skipped';

interface Props {
  status?: string;
  className?: string;
}

const CONFIG: Record<ModuleStatus, { label: string; tone: string; icon: typeof Check }> = {
  done: {
    label: 'Done',
    tone: 'text-racing-green-lit border-racing-green-lit/40',
    icon: Check,
  },
  in_progress: {
    label: 'In Progress',
    tone: 'text-gold-leaf border-gold-leaf/40',
    icon: Clock,
  },
  pending: {
    label: 'Pending',
    tone: 'text-chrome border-mist/60',
    icon: Circle,
  },
  locked: {
    label: 'Locked',
    tone: 'text-chrome/70 border-mist/40',
    icon: Lock,
  },
  needs_refresh: {
    label: 'Needs Refresh',
    tone: 'text-chrome border-mist/60',
    icon: RotateCw,
  },
  skipped: {
    label: 'Skipped',
    tone: 'text-chrome/60 border-mist/30',
    icon: Circle,
  },
};

function normalize(status: string | undefined): ModuleStatus {
  if (!status) return 'pending';
  const s = status.toLowerCase().replace(/[-_\s]+/g, '_');
  if (s.startsWith('done')) return 'done';
  if (s.includes('progress')) return 'in_progress';
  if (s.includes('lock')) return 'locked';
  if (s.includes('refresh')) return 'needs_refresh';
  if (s.includes('skip')) return 'skipped';
  return 'pending';
}

export function StatusBadge({ status, className }: Props) {
  const norm = normalize(status);
  const cfg = CONFIG[norm];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 border
                  font-mono text-caption tracking-luxury uppercase
                  ${cfg.tone} ${className ?? ''}`}
    >
      <Icon size={11} strokeWidth={1.5} />
      <span>{cfg.label}</span>
    </span>
  );
}
