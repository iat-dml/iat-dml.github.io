import { sans } from "./fonts";

// The window is sized so the viewport is exactly 1600 frame px wide — matching
// the capture viewport, so zoom 1 is a true 1:1 rendering of the page.
export const FRAME_VIEWPORT = {
  x: 160,
  y: 92,
  width: 1600,
  height: 856,
} as const;

/**
 * A stylised browser window on the site's paper background. Children are
 * clipped to the viewport rect above.
 *
 * The same frame is rendered by every page scene, so a hard cut between scenes
 * reads as navigation rather than as an edit — the window stays put and only
 * the page and the URL change.
 */
export const BrowserFrame: React.FC<{
  url: string;
  children: React.ReactNode;
  opacity?: number;
}> = ({ url, children, opacity = 1 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        top: 32,
        width: 1640,
        height: 936,
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        boxShadow: "0 30px 70px rgba(53, 98, 89, 0.22)",
        overflow: "hidden",
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1640,
          height: 60,
          backgroundColor: "#EDE9E1",
          borderBottom: "1px solid rgba(70, 85, 85, 0.16)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 24,
          gap: 11,
        }}
      >
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: "rgba(70, 85, 85, 0.28)",
          }}
        />
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: "rgba(70, 85, 85, 0.28)",
          }}
        />
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: "rgba(70, 85, 85, 0.28)",
          }}
        />
        <div
          style={{
            marginLeft: 22,
            minWidth: 620,
            height: 34,
            borderRadius: 17,
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(70, 85, 85, 0.14)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 20,
            paddingRight: 20,
            fontFamily: sans,
            fontSize: 20,
            fontWeight: 500,
            color: "#465555",
          }}
        >
          {url}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: FRAME_VIEWPORT.x - 140,
          top: FRAME_VIEWPORT.y - 32,
          width: FRAME_VIEWPORT.width,
          height: FRAME_VIEWPORT.height,
          overflow: "hidden",
          backgroundColor: "#F5F3EE",
        }}
      >
        {children}
      </div>
    </div>
  );
};
