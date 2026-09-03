import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BrowserFrame, FRAME_VIEWPORT } from "../BrowserFrame";
import { Caption } from "../Caption";
import { PageShot } from "../PageShot";

/**
 * The Policy Lab Guide project page: read the title and lead, then drop to the
 * embedded tool sitting in the page. The tour ends the scene there — the tool
 * gets demonstrated in its own video, PolicyLabGuideTour.
 *
 * Measured page coordinates: h1 y93, lead paragraphs y287-545, embedded iframe
 * (233,562) 1135x600, so its centre is (800, 862).
 */
export const PolicyPageScene: React.FC = () => {
  const frame = useCurrentFrame();

  const camera = {
    viewportWidth: FRAME_VIEWPORT.width,
    viewportHeight: FRAME_VIEWPORT.height,
    // 1.4 is the ceiling for prose here: the content column is 1135 CSS px
    // wide, so anything tighter cuts words off the ends of every line. Body
    // copy lands at ~22px — enough to register as explanatory text, while the
    // h1 reads at ~55px and the caption carries the point.
    zoom: interpolate(frame, [0, 40, 150, 245], [1.0, 1.0, 1.4, 1.25], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
    focusX: 800,
    focusY: interpolate(frame, [0, 40, 150, 245], [428, 428, 330, 862], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  };

  return (
    <AbsoluteFill name="Policy page scene" style={{ backgroundColor: "#F5F3EE" }}>
      <BrowserFrame url="iat-dml.github.io/projects/policy-lab-guide">
        <PageShot shot="policy-page-full" camera={camera} />
      </BrowserFrame>

      <Caption
        opacity={interpolate(frame, [55, 78, 150, 172], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        These provide more details of what the support entailed
      </Caption>

      <Caption
        opacity={interpolate(frame, [182, 205], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        often with the output itself embedded in the page to explore
      </Caption>
    </AbsoluteFill>
  );
};
