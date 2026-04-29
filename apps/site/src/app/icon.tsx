import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
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
          fontSize: 24,
          fontFamily: 'serif',
          fontWeight: 300,
          letterSpacing: '-0.02em',
          borderBottom: '2px solid #B8963E',
        }}
      >
        F
      </div>
    ),
    { ...size },
  );
}
