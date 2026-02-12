interface RingTextOverlayProps {
  labelsFromSelector?: string;
  currentLabel: string;
}

/**
 * Текст по орбите вокруг центра (орбита ~100px).
 * Контра-вращение: rotate="0" на textPath — текст остаётся читаемым.
 */
export function RingTextOverlay({ currentLabel }: RingTextOverlayProps) {
  const repeated = `${currentLabel} · `.repeat(4);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 200,
        height: 200,
        marginTop: -100,
        marginLeft: -100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 200,
          height: 200,
          animation: 'orbit-rotate 12s linear infinite',
        }}
      >
        <svg viewBox="0 0 200 200" style={{ width: 200, height: 200 }}>
          <defs>
            <path
              id="particle-sphere-ring-path"
              d="M 100,100 m -100,0 a 100,100 0 1,1 200,0 a 100,100 0 1,1 -200,0"
            />
          </defs>
          <text>
            <textPath href="#particle-sphere-ring-path" rotate="0" className="ring-text-path">
              {repeated}
            </textPath>
          </text>
        </svg>
      </div>
      <style>{`
        @keyframes orbit-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ring-text-path {
          fill: rgba(255, 255, 255, 0.2);
          font-size: clamp(0.4rem, 0.85vw, 0.7rem);
          font-family: 'Raleway', sans-serif;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
