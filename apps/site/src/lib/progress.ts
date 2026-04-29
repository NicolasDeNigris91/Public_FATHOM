import 'server-only';
import { getRootDoc } from './content';

export type GateMark = 'passed' | 'in_progress' | 'pending' | 'locked' | 'refresh';

export interface ProgressRow {
  rawId: string;       // 01-01, 02-09, CAPSTONE-fundamentos
  module: string;
  conceitual: GateMark;
  pratico: GateMark;
  conexoes: GateMark;
  status: string;      // LOCKED | DONE | etc.
  stageNumber: number;
}

export interface ProgressSnapshot {
  activeStage: string;
  activeModule: string;
  nextModule: string;
  updatedAt: string;
  rows: ProgressRow[];
}

const GATE_SYMBOLS: Record<string, GateMark> = {
  '✅': 'passed',
  '⏳': 'in_progress',
  '⬜': 'pending',
  '🔒': 'locked',
  '🔁': 'refresh',
};

function classify(cell: string): GateMark {
  const trimmed = cell.trim();
  for (const [sym, mark] of Object.entries(GATE_SYMBOLS)) {
    if (trimmed.startsWith(sym)) return mark;
  }
  if (trimmed === ', ' || trimmed === '-') return 'pending';
  return 'pending';
}

export async function loadProgress(): Promise<ProgressSnapshot | null> {
  const raw = await getRootDoc('PROGRESS');
  if (!raw) return null;

  const lines = raw.split(/\r?\n/);
  const snapshot: ProgressSnapshot = {
    activeStage: '',
    activeModule: '',
    nextModule: '',
    updatedAt: '',
    rows: [],
  };

  for (const line of lines.slice(0, 20)) {
    const m1 = line.match(/^\*\*Estágio ativo:\*\*\s*(.+)$/);
    if (m1) snapshot.activeStage = m1[1].trim();
    const m2 = line.match(/^\*\*Módulo ativo:\*\*\s*(.+)$/);
    if (m2) snapshot.activeModule = m2[1].trim();
    const m3 = line.match(/^\*\*Próximo módulo:\*\*\s*(.+)$/);
    if (m3) snapshot.nextModule = m3[1].trim();
    const m4 = line.match(/^\*\*Atualizado em:\*\*\s*(.+)$/);
    if (m4) snapshot.updatedAt = m4[1].trim();
  }

  let stageNumber = 0;
  for (const line of lines) {
    const stageMatch = line.match(/^##\s+Estágio\s+(\d+)/);
    if (stageMatch) {
      stageNumber = parseInt(stageMatch[1], 10);
      continue;
    }

    if (!line.startsWith('|') || !stageNumber) continue;

    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 6) continue;
    if (cells[0].startsWith('---') || cells[0].toLowerCase() === 'id' || cells[0] === '') {
      continue;
    }

    const rawId = cells[0].replace(/\*\*/g, '').trim();
    const moduleName = cells[1].replace(/\*\*/g, '').trim();
    if (!rawId) continue;

    snapshot.rows.push({
      rawId,
      module: moduleName,
      conceitual: classify(cells[2]),
      pratico: classify(cells[3]),
      conexoes: classify(cells[4]),
      status: cells[5].toUpperCase(),
      stageNumber,
    });
  }

  return snapshot;
}

export function summarize(rows: ProgressRow[]) {
  const totals = {
    total: rows.length,
    done: 0,
    inProgress: 0,
    pending: 0,
    refresh: 0,
  };
  for (const r of rows) {
    if (r.status === 'DONE') totals.done += 1;
    else if (r.conceitual === 'in_progress' || r.pratico === 'in_progress' || r.conexoes === 'in_progress') {
      totals.inProgress += 1;
    } else if (r.conceitual === 'refresh') {
      totals.refresh += 1;
    } else {
      totals.pending += 1;
    }
  }
  return totals;
}
