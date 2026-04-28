import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/**
 * Build-time build identifier. Useful pra confirmar que um deploy
 * subiu — compare hash retornado com o commit local.
 *
 * Em Railway, o build pode injetar RAILWAY_GIT_COMMIT_SHA via env.
 * Localmente fica 'dev'.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'fathom-site',
      gitSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_SHA ?? 'dev',
      branch: process.env.RAILWAY_GIT_BRANCH ?? 'main',
      builtAt: process.env.BUILD_TIME ?? new Date().toISOString(),
      node: process.version,
      env: process.env.NODE_ENV ?? 'unknown',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
      },
    },
  );
}
