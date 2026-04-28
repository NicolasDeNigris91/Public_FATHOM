import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0A',
          color: '#F5F5F0',
          fontSize: 130,
          fontFamily: 'serif',
          fontWeight: 300,
          letterSpacing: '-0.04em',
        }}
      >
        F
        <div
          style={{
            width: 60,
            height: 4,
            backgroundColor: '#B8963E',
            marginTop: 6,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
