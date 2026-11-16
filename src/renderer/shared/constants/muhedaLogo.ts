export const MUHEDA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="MUHEDA Clinic">
  <defs>
    <path id="muheda-top-arc" d="M 112 225 A 152 152 0 0 1 400 225" />
    <path id="muheda-bottom-arc" d="M 402 315 A 150 150 0 0 1 110 315" />
  </defs>
  <g fill="none" stroke="#000" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="256" cy="245" r="178" />
    <circle cx="256" cy="245" r="122" />
    <polygon points="158,286 158,178 187,150 216,178 216,286" />
    <path d="M250 286V166h18v120" />
    <path d="M250 176h18M250 195h18M250 214h18M250 233h18M250 252h18M250 271h18" />
    <path d="M251 166l8-18 8 18" />
    <path d="M319 171c20 0 34 15 34 34v12c0 24-19 43-43 43h-16" />
    <path d="M319 171v-15M319 156c0-8-7-15-15-15s-15 7-15 15 7 15 15 15" />
    <path d="M294 260v14c0 34 28 62 62 62 15 0 27-12 27-27s-12-27-27-27" />
    <circle cx="350" cy="267" r="15" />
    <circle cx="350" cy="267" r="5" fill="#000" />
  </g>
  <g fill="#000" font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle">
    <text font-size="19" letter-spacing="1.2">
      <textPath href="#muheda-top-arc" startOffset="50%">MUSLIM HEALTH DEVELOPMENT</textPath>
    </text>
    <text x="256" y="354" font-size="22" letter-spacing="2.4">ALTERNATIVE</text>
  </g>
  <rect x="96" y="402" width="320" height="62" fill="none" stroke="#000" stroke-width="9" />
  <text x="256" y="444" fill="#000" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="800" text-anchor="middle" letter-spacing="1.4">MUHEDA CLINIC</text>
</svg>`;

export const MUHEDA_LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  MUHEDA_LOGO_SVG,
)}`;
