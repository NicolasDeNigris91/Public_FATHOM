import Script from 'next/script';

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const scriptSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT;
  if (!domain || !scriptSrc) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src={scriptSrc}
      strategy="afterInteractive"
    />
  );
}
