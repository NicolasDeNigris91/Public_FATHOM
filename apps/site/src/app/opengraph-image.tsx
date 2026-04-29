import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Fathom, Notas de engenharia de software';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
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
              marginBottom: 32,
            }}
          >
            {`Caderno de estudos · ${new Date().getFullYear()}`}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 200,
              fontWeight: 300,
              color: '#F5F5F0',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 24,
            }}
          >
            Fathom
          </div>
          <div
            style={{
              width: 200,
              height: 2,
              backgroundColor: '#B8963E',
              marginBottom: 40,
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: 36,
              fontWeight: 300,
              color: '#C0C0C0',
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            Minhas notas de estudo de engenharia de software.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 300,
              color: '#C0C0C0',
              fontStyle: 'italic',
              marginTop: 16,
            }}
          >
            Organizadas por estágio.
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
          <div style={{ display: 'flex' }}>5 Estágios · 78 Módulos · 5 Capstones</div>
          <div style={{ display: 'flex' }}>Nicolas De Nigris</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
