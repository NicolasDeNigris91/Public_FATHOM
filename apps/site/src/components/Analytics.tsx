import Script from 'next/script';

/**
 * Privacy-friendly analytics, opt-in via env vars at build time.
 *
 * Supports Plausible (self-hosted or hosted). To enable:
 *
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=fathom.nicolaspilegidenigris.dev
 *   NEXT_PUBLIC_PLAUSIBLE_SCRIPT=https://plausible.io/js/script.js
 *
 * If either var is missing, this component renders nothing — zero
 * tracking, zero script tag. No cookies, no PII collected; Plausible
 * is GDPR/LGPD-compliant by design.
 */
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
