/**
 * WorkshopLogo — Logo del taller
 * Muestra logoelcordobes.png desde /public. Si falla la carga, cae al SVG original.
 *
 * Props:
 *   size    — px del lado del cuadrado (default 64)
 *   uid     — sufijo único (no usado para imagen, mantenido por compatibilidad)
 */
import { useState } from 'react';

export function WorkshopLogo({ size = 64, uid = '0' }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src="/logoelcordobes.png"
        alt="El Cordobés"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: SVG original
  const gId = `wlogo-g-${uid}`;
  const sId = `wlogo-s-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={gId} cx="38%" cy="30%" r="68%">
          <stop offset="0%"   stopColor="#fb923c" />
          <stop offset="60%"  stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id={sId} cx="40%" cy="20%" r="55%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.28" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${gId})`} />
      <circle cx="32" cy="32" r="31" fill={`url(#${sId})`} />
      <circle cx="32" cy="32" r="29.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <g transform="rotate(-45, 32, 32)">
        <path
          d={[
            'M 12 20','Q 10 20 10 22','L 10 26','L 27 26','L 27 38',
            'L 10 38','L 10 42','Q 10 44 12 44','L 30 44','L 30 37',
            'L 52 37','Q 57 37 57 32','Q 57 27 52 27','L 30 27',
            'L 30 20','L 12 20','Z',
          ].join(' ')}
          fill="white"
        />
      </g>
    </svg>
  );
}
