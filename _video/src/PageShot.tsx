import { Img, staticFile } from "remotion";

// Every shot in public/shots was captured at a 1600 CSS-px-wide viewport, so
// `zoom` is literally "frame pixels per page pixel": at zoom 1 the page renders
// at its native CSS size, at zoom 2 body copy is 32px on screen.
export const CAPTURE_CSS_WIDTH = 1600;

/**
 * Where the camera is looking: the page coordinate held at the centre of the
 * viewport, and how far in. Scenes build one of these per scene and share it
 * between the page and the cursor so the two can never drift apart.
 */
export type Camera = {
  zoom: number;
  focusX: number;
  focusY: number;
  viewportWidth: number;
  viewportHeight: number;
};

/**
 * A captured page positioned so that (focusX, focusY) sits at the centre of the
 * surrounding viewport. Scrolling and pushing in are the same operation: move
 * the focus point, change the zoom.
 *
 * Meant to live inside a clipping container of the camera's viewport size.
 */
export const PageShot: React.FC<{
  shot: string;
  camera: Camera;
  opacity?: number;
}> = ({ shot, camera, opacity = 1 }) => {
  return (
    <Img
      src={staticFile(`shots/${shot}.png`)}
      style={{
        position: "absolute",
        width: CAPTURE_CSS_WIDTH * camera.zoom,
        height: "auto",
        left: camera.viewportWidth / 2 - camera.focusX * camera.zoom,
        top: camera.viewportHeight / 2 - camera.focusY * camera.zoom,
        opacity,
      }}
    />
  );
};

/** Maps a page coordinate into the camera's viewport coordinates. */
export const pageToViewport = (cssX: number, cssY: number, camera: Camera) => ({
  x: camera.viewportWidth / 2 + (cssX - camera.focusX) * camera.zoom,
  y: camera.viewportHeight / 2 + (cssY - camera.focusY) * camera.zoom,
});
