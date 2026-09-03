import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Caption } from "../Caption";
import { Cursor } from "../Cursor";
import { PageShot } from "../PageShot";
import { sans, serif } from "../fonts";

/**
 * The Policy Lab Guide tool, full frame — the whole of PolicyLabGuideTour.
 *
 * Beat 1: the concept diagram of the Policy Lab phases. Click Co-Design, then
 *         pull back so the detail panels it opens are all on screen.
 * Beat 2: the method library, narrowing 14 methods to 2 as the phase, actor and
 *         effort filters go on.
 * Beat 3: push into the two surviving method cards so their names are readable.
 *
 * Layering: each captured state fades in on top of the previous one and stays,
 * so there is never a frame where two half-transparent shots let the background
 * through. Fades are only 6 frames because clicking a phase re-lays-out the
 * whole app — a slow cross-dissolve ghosts two different layouts over each other.
 *
 * Measured tool coordinates (1600 CSS-px viewport): tabs "Concept diagram"
 * (660,18) and "Method library" (811,18); phase Co-Design (836,412) 168x79;
 * filter chips Co-Design (28,243), Researchers (28,416), Low effort (28,523);
 * results count (1490,110) 74x22; method cards 300x192 at x316 and x632, y153.
 */
export const PolicyToolScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Full-bleed, so the camera's viewport is the whole composition. zoom 1.2 is
  // the floor here, not a choice: the capture is 1600 CSS px wide, so anything
  // less than 1920/1600 leaves the frame edges uncovered.
  const camera = {
    viewportWidth: 1920,
    viewportHeight: 1080,
    zoom: interpolate(
      frame,
      [0, 60, 110, 130, 180, 600, 720],
      [1.2, 1.2, 1.55, 1.55, 1.2, 1.2, 2.0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
    focusX: interpolate(
      frame,
      [0, 60, 110, 130, 180, 600, 720],
      [800, 800, 920, 920, 800, 800, 624],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
    focusY: interpolate(
      frame,
      [0, 60, 110, 130, 180, 600, 720],
      [450, 450, 548, 548, 450, 450, 285],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
  };

  return (
    <AbsoluteFill name="Policy tool scene" style={{ backgroundColor: "#FFFFFF" }}>
      <PageShot shot="policy-tool-diagram" camera={camera} />
      <PageShot
        shot="policy-tool-diagram-active"
        camera={camera}
        opacity={interpolate(frame, [146, 152], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods"
        camera={camera}
        opacity={interpolate(frame, [290, 296], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods-f1"
        camera={camera}
        opacity={interpolate(frame, [386, 392], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods-f2"
        camera={camera}
        opacity={interpolate(frame, [446, 452], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods-f3"
        camera={camera}
        opacity={interpolate(frame, [516, 522], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />

      {/* The tool's own results count renders at ~17px once the whole app is on
          screen — too small to read from a room, so it gets a ring and a large
          readout beside it. Positions assume the zoom-1.2 framing held from
          frame 180 to 600, which is the only window these are visible in. */}
      <Interactive.Div
        name="Results count ring"
        style={{
          position: "absolute",
          left: 1780,
          top: 124,
          width: 105,
          height: 43,
          border: "4px solid #B1BE4D",
          borderRadius: 12,
          opacity: interpolate(frame, [300, 318, 560, 585], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />

      <Interactive.Div
        name="Count 14"
        style={{
          position: "absolute",
          right: 35,
          top: 186,
          fontFamily: serif,
          fontSize: 78,
          color: "#356259",
          textAlign: "right",
          opacity: interpolate(frame, [300, 318, 386, 398], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        14 methods
      </Interactive.Div>

      <Interactive.Div
        name="Count 5"
        style={{
          position: "absolute",
          right: 35,
          top: 186,
          fontFamily: serif,
          fontSize: 78,
          color: "#356259",
          textAlign: "right",
          opacity: interpolate(frame, [386, 398, 516, 528], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        5 methods
      </Interactive.Div>

      <Interactive.Div
        name="Count 2"
        style={{
          position: "absolute",
          right: 35,
          top: 186,
          fontFamily: serif,
          fontSize: 78,
          color: "#A4713D",
          textAlign: "right",
          opacity: interpolate(frame, [516, 528, 560, 585], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        2 methods
      </Interactive.Div>

      <Interactive.Div
        name="Count label"
        style={{
          position: "absolute",
          right: 35,
          top: 278,
          fontFamily: sans,
          fontSize: 27,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "#6C6C6C",
          textAlign: "right",
          opacity: interpolate(frame, [310, 330, 560, 585], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        matching the filters
      </Interactive.Div>

      <Cursor
        camera={camera}
        cssX={interpolate(
          frame,
          [70, 110, 250, 285, 300, 380, 400, 440, 460, 512],
          [1150, 920, 920, 876, 876, 76, 76, 73, 73, 67],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        )}
        cssY={interpolate(
          frame,
          [70, 110, 250, 285, 300, 380, 400, 440, 460, 512],
          [700, 451, 451, 34, 34, 257, 257, 430, 430, 537],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        )}
        click={interpolate(
          frame,
          [130, 148, 149, 285, 303, 304, 385, 403, 404, 445, 463, 464, 515, 533],
          [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )}
        opacity={interpolate(frame, [60, 80, 530, 556], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />

      <Caption
        opacity={interpolate(frame, [10, 32, 104, 126], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Policy Lab Guide — the tool embedded in its project page
      </Caption>

      <Caption
        opacity={interpolate(frame, [136, 158, 242, 262], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Two ways in — a concept diagram of the Policy Lab phases…
      </Caption>

      <Caption
        opacity={interpolate(frame, [272, 294, 578, 600], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        …and a method library, filtered by phase, actor, effort and skill
      </Caption>

      <Caption
        opacity={interpolate(frame, [616, 638], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Two methods match: Co-Design · Researchers · Low effort
      </Caption>
    </AbsoluteFill>
  );
};
