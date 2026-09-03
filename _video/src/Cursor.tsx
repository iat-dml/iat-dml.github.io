import { type Camera, pageToViewport } from "./PageShot";

/**
 * A drawn pointer positioned by *page* coordinate, so scenes aim it at the
 * element rectangles measured in public/shots/manifest.json rather than at
 * hand-computed frame pixels. It shares the scene's camera, so it stays glued
 * to its target through scrolls and push-ins.
 *
 * `click` drives press-and-ripple: 0 = idle, 1 = fully rippled out.
 */
export const Cursor: React.FC<{
  cssX: number;
  cssY: number;
  camera: Camera;
  click?: number;
  opacity?: number;
}> = ({ cssX, cssY, camera, click = 0, opacity = 1 }) => {
  const at = pageToViewport(cssX, cssY, camera);

  return (
    <div
      style={{
        position: "absolute",
        left: at.x,
        top: at.y,
        width: 0,
        height: 0,
        opacity,
      }}
    >
      {/* click ripple, expanding and fading outward from the tip */}
      <div
        style={{
          position: "absolute",
          left: -60,
          top: -60,
          width: 120,
          height: 120,
          borderRadius: 60,
          border: "4px solid #B1BE4D",
          scale: 0.15 + click * 0.85,
          opacity: click > 0 ? 1 - click : 0,
        }}
      />
      <svg
        width="42"
        height="52"
        viewBox="0 0 42 52"
        style={{
          position: "absolute",
          left: -3,
          top: -2,
          scale: 1 - click * 0.14,
          filter: "drop-shadow(0 3px 5px rgba(26, 26, 26, 0.4))",
        }}
      >
        <path
          d="M 3 2 L 3 38 L 12.5 29.5 L 19 45 L 26 42 L 19.5 26.5 L 32 26 Z"
          fill="#1A1A1A"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
