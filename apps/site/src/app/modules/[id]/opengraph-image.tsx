import { ImageResponse } from 'next/og';
import { getAllModules, getModuleByRawId } from '@/lib/content';
import { getStage } from '@/lib/stages';

export const runtime = 'nodejs';
export const alt = 'Fathom module';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateStaticParams() {
  const all = await getAllModules();
  return all.map((m) => ({ id: m.id }));
}

export default async function ModuleOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let mod: Awaited<ReturnType<typeof getModuleByRawId>> = null;
  try {
    mod = await getModuleByRawId(id);
  } catch {
    mod = null;
  }
  const stage = mod ? getStage(mod.stageId) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0A0A0A',
          padding: '80px',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 22,
              color: '#1A6B50',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            {`${
              stage
                ? `Estágio ${String(stage.number).padStart(2, '0')} · ${stage.title}`
                : 'Fathom'
            }${mod ? ` · ${mod.rawId}` : ''}`}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: mod && mod.title.length > 40 ? 80 : 110,
              fontWeight: 300,
              color: '#F5F5F0',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              marginBottom: 24,
              maxWidth: '100%',
            }}
          >
            {mod ? mod.title : 'Module not found'}
          </div>
          <div
            style={{
              width: 200,
              height: 2,
              backgroundColor: '#B8963E',
              marginBottom: 32,
            }}
          />
          {mod && mod.prereqs.length > 0 && (
            <div
              style={{
                display: 'flex',
                fontFamily: 'monospace',
                fontSize: 22,
                color: '#C0C0C0',
                letterSpacing: '0.05em',
              }}
            >
              {`Prereqs: ${mod.prereqs.join(' · ')}`}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontFamily: 'monospace',
            fontSize: 18,
            color: '#3A3A3A',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <div style={{ display: 'flex' }}>Fathom · Framework de Maestria</div>
          <div style={{ display: 'flex' }}>Nicolas De Nigris</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
