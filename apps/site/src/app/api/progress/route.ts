import { NextResponse } from 'next/server';
import { loadProgress, summarize } from '@/lib/progress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Programmatic access to current progress snapshot.
 * Useful for external tooling: webhook into another service,
 * Anki sync, custom dashboards, etc.
 *
 * Same data the /progress page renders, in JSON.
 */
export async function GET() {
  const snap = await loadProgress();
  if (!snap) {
    return NextResponse.json(
      { ok: false, error: 'PROGRESS.md not found' },
      { status: 404 },
    );
  }
  const totals = summarize(snap.rows);
  return NextResponse.json(
    {
      ok: true,
      activeStage: snap.activeStage,
      activeModule: snap.activeModule,
      nextModule: snap.nextModule,
      updatedAt: snap.updatedAt,
      totals,
      rows: snap.rows,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
