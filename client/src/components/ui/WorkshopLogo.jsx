/**
 * WorkshopLogo — Logo del taller con llave de boca (open-end spanner)
 * Silhoueta sólida blanca sobre círculo con degradé naranja-rojizo.
 *
 * Props:
 *   size    — px del lado del cuadrado (default 64)
 *   uid     — sufijo único para el ID del degradé (evita conflictos si
 *             hay varias instancias en la misma página)
 */
export function WorkshopLogo({ size = 64, uid = '0' }) {
  const gId = `wlogo-g-${uid}`;
  const sId = `wlogo-s-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Degradé radial para el círculo — aspecto 3D */}
        <radialGradient id={gId} cx="38%" cy="30%" r="68%">
          <stop offset="0%"   stopColor="#fb923c" />
          <stop offset="60%"  stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>

        {/* Brillo superior */}
        <radialGradient id={sId} cx="40%" cy="20%" r="55%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.28" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Círculo base ── */}
      <circle cx="32" cy="32" r="31" fill={`url(#${gId})`} />

      {/* Brillo esférico */}
      <circle cx="32" cy="32" r="31" fill={`url(#${sId})`} />

      {/* Borde interior sutil */}
      <circle
        cx="32" cy="32" r="29.5"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />

      {/*
        ── Llave de boca (open-end spanner) ──
        Antes de rotar (eje X = horizontal):
          • Mango: y 27-37, x 30-54 (redondeado a la derecha)
          • Cabeza:  x 10-30, abre el slot a la derecha
            - Quijada superior: y 20-26
            - Quijada inferior: y 38-44
            - Pared izquierda cerrada: x 10, y 26-38
            - Borde interior del slot: x 27, y 26-38
        Rotada -45° alrededor del centro: mango al NE, cabeza al SW
      */}
      <g transform="rotate(-45, 32, 32)">
        <path
          d={[
            'M 12 20',           // esquina sup-izq (redondeada a cont.)
            'Q 10 20 10 22',     // curva esquina exterior sup-izq
            'L 10 26',           // pared izq superior → borde superior del slot
            'L 27 26',           // borde interior superior del slot
            'L 27 38',           // borde interior inferior del slot
            'L 10 38',           // pared izq inferior ← borde inferior del slot
            'L 10 42',           // pared izq hasta esquina inf
            'Q 10 44 12 44',     // curva esquina exterior inf-izq
            'L 30 44',           // quijada inferior → derecha
            'L 30 37',           // conexión mango-cabeza (abajo)
            'L 52 37',           // mango abajo
            'Q 57 37 57 32',     // curva extremo derecho mango (abajo→centro)
            'Q 57 27 52 27',     // curva extremo derecho mango (centro→arriba)
            'L 30 27',           // mango arriba ← left
            'L 30 20',           // conexión mango-cabeza (arriba)
            'L 12 20',           // quijada superior ← derecha
            'Z',
          ].join(' ')}
          fill="white"
        />
      </g>
    </svg>
  );
}
