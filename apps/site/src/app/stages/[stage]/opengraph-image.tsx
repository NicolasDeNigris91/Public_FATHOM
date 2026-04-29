import { ImageResponse } from 'next/og';
import { STAGES, getStage } from '@/lib/stages';

export const runtime = 'nodejs';
export const alt = 'Fathom stage';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateStaticParams() {
  return STAGES.map((s) => ({ stage: s.id }));
}

export default async function StageOpengraphImage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage: stageId } = await params;
  const stage = getStage(stageId);

  if (!stage) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0A0A0A',
            color: '#F5F5F0',
            fontFamily: 'serif',
            fontSize: 80,
          }}
        >
          Fathom
        </div>
      ),
      { ...size },
    );
  }

  const number = String(stage.number).padStart(2, '0');

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
            {`Fathom · Estágio ${number}`}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 160,
              fontWeight: 300,
              color: '#F5F5F0',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            {stage.title}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 26,
              color: '#C0C0C0',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 32,
            }}
          >
            {stage.subtitle}
          </div>
          <div
            style={{
              width: 200,
              height: 2,
              backgroundColor: '#B8963E',
              marginBottom: 32,
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              fontWeight: 300,
              color: '#C0C0C0',
              lineHeight: 1.4,
              maxWidth: 1000,
            }}
          >
            {stage.tagline.length > 240 ? stage.tagline.slice(0, 237) + '...' : stage.tagline}
          </div>
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
          <div style={{ display: 'flex' }}>{`${stage.moduleCount} módulos · 1 capstone`}</div>
          <div style={{ display: 'flex' }}>Nicolas De Nigris</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
