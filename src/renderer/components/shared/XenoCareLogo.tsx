import React from 'react';

export type XenoCareLogoVariant = 'brand' | 'white';

interface XenoCareLogoProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  /** Brand = navy/orange on light surfaces; white = monochrome on colour. */
  variant?: XenoCareLogoVariant;
  /** Show only the symbol, without the XENOCARE wordmark. */
  compact?: boolean;
  /** Show the “by Xenolink” sub-brand signature when the wordmark is visible. */
  showVendor?: boolean;
}

/**
 * XenoCare — the clinical member of the Xenolink product family.
 * The symbol combines the Xenolink “X” with a medical cross.
 */
export default function XenoCareLogo({
  variant = 'brand',
  compact = false,
  showVendor = true,
  ...props
}: XenoCareLogoProps) {
  const isWhite = variant === 'white';
  const badge = '#0E2A47';
  const badgeBorder = isWhite ? 'rgba(255,255,255,0.28)' : 'none';
  const symbol = '#FFFFFF';
  const cross = '#F97316';
  const wordmark = isWhite ? '#FFFFFF' : '#0E2A47';
  const accent = '#F97316';
  const signature = isWhite ? 'rgba(255,255,255,0.82)' : '#64748B';

  const mark = (
    <g>
      <rect
        x="5"
        y="5"
        width="102"
        height="102"
        rx="27"
        fill={badge}
        stroke={badgeBorder}
        strokeWidth="2"
      />
      <path
        d="M29 29L83 83M83 29L29 83"
        fill="none"
        stroke={symbol}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M51 40H61V51H72V61H61V72H51V61H40V51H51V40Z"
        fill={cross}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
  );

  if (compact) {
    return (
      <svg
        viewBox="0 0 112 112"
        role="img"
        aria-label="XenoCare by Xenolink"
        {...props}
      >
        {mark}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 520 126"
      role="img"
      aria-label="XenoCare by Xenolink"
      {...props}
    >
      {mark}
      <text
        x="139"
        y={showVendor ? 67 : 76}
        fill={wordmark}
        fontFamily="Poppins, Inter, 'Segoe UI', Arial, sans-serif"
        fontSize="51"
        fontWeight="800"
        letterSpacing="-2"
      >
        <tspan>X</tspan>
        <tspan fill={accent}>E</tspan>
        <tspan>NOCARE</tspan>
      </text>
      {showVendor && (
        <text
          x="143"
          y="96"
          fill={signature}
          fontFamily="Inter, 'Segoe UI', Arial, sans-serif"
          fontSize="16"
          fontWeight="600"
          letterSpacing="1.5"
        >
          by Xenolink
        </text>
      )}
    </svg>
  );
}
