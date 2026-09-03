import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BrowserFrame, FRAME_VIEWPORT } from "../BrowserFrame";
import { Caption } from "../Caption";
import { PageShot } from "../PageShot";

/**
 * The resources collection: establish, then a steady scroll down the whole page
 * so the section headings register one after another and the sheer length of the
 * link library does the arguing.
 *
 * Zoom is held at 1.4, not higher: the content column runs x233-1368, so
 * anything past ~1.41 clips the start of every heading and link. At 1.4 the
 * column fits exactly and the h2 headings — the thing to actually read as this
 * scrolls — render around 57px.
 *
 * Measured h2 positions: y583 Open Science, y1068 Data visualisation, y1233 R,
 * y1352 Quarto, y1472 Generative AI, y1682 Tools and Software, y2167 Training.
 */
export const ResourcesScene: React.FC = () => {
  const frame = useCurrentFrame();

  const camera = {
    viewportWidth: FRAME_VIEWPORT.width,
    viewportHeight: FRAME_VIEWPORT.height,
    zoom: interpolate(frame, [0, 40, 120], [1.0, 1.0, 1.4], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
    focusX: 800,
    focusY: interpolate(
      frame,
      [0, 40, 120, 420, 480],
      // Ceiling is pageHeight - viewportHeight/(2*zoom) = 2712 - 306 = 2406,
      // past which the page bottom lifts clear and leaves a blank strip.
      [428, 428, 300, 2340, 2380],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.33, 0, 0.67, 1),
      },
    ),
  };

  return (
    <AbsoluteFill name="Resources scene" style={{ backgroundColor: "#F5F3EE" }}>
      <BrowserFrame url="iat-dml.github.io/resources">
        <PageShot shot="resources-full" camera={camera} />
      </BrowserFrame>

      <Caption
        opacity={interpolate(frame, [58, 80, 190, 212], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        A growing collection on data, scientific programming and software
      </Caption>

      <Caption
        opacity={interpolate(frame, [222, 244], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Open Science · Data Visualisation · Scientific Programming  · Generative AI · Tools & Software · Training
      </Caption>
    </AbsoluteFill>
  );
};
