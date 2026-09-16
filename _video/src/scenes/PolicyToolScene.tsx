import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Caption } from "../Caption";
import { Cursor } from "../Cursor";
import { PageShot } from "../PageShot";

/**
 * The Policy Lab Guide tool, full frame — the whole of PolicyLabGuideTour.
 *
 * Beat 1: the concept diagram of the Policy Lab phases, wide.
 * Beat 2: click Co-Design, pull back so the panels it opens are all on screen,
 *         then push into them. This is the long beat of the video: at zoom 1.6
 *         the frame holds the diagram on the left, the context-layer tooltip
 *         with its actors in the middle and the phase panel — objectives, then
 *         recommended methods — on the right, which is the three things the
 *         caption names, all readable at once.
 * Beat 3: the method library, narrowing to two cards as the phase, actor and
 *         effort filters go on.
 * Beat 4: push into the two surviving method cards so their names are readable.
 *
 * Layering: each captured state fades in on top of the previous one and stays,
 * so there is never a frame where two half-transparent shots let the background
 * through. Fades are only 6 frames because clicking a phase re-lays-out the
 * whole app — a slow cross-dissolve ghosts two different layouts over each other.
 *
 * The cursor is hidden through beat 2's reading pause: it presses nothing there,
 * and a pointer drifting over a panel is noise rather than direction.
 *
 * Measured tool coordinates (1600 CSS-px viewport, page 1050 tall in the
 * diagram states): tabs "Concept diagram" (660,18) and "Method library"
 * (811,18); phase Co-Design (836,412) 168x79 at rest, which the open panel
 * shifts left to (603,412); the phase panel occupies x1142-1600; filter chips
 * Co-Design (28,243), Researchers (28,416), Low effort (28,523); method cards
 * 300x192 at x316 and x632, y153.
 */
export const PolicyToolScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Full-bleed, so the camera's viewport is the whole composition. zoom 1.2 is
  // the floor here, not a choice: the capture is 1600 CSS px wide, so anything
  // less than 1920/1600 leaves the frame edges uncovered.
  //
  // The panel beat's focusX of 990 is the far end of what zoom 1.6 allows: half
  // a frame is 600 page px at that zoom, so 990 puts the right edge at page
  // 1590, ten px inside the capture. Any further right and the frame runs off
  // the shot.
  const camera = {
    viewportWidth: 1920,
    viewportHeight: 1080,
    zoom: interpolate(
      frame,
      [0, 110, 170, 195, 245, 330, 400, 500, 560, 620, 955, 1075],
      [1.2, 1.2, 1.55, 1.55, 1.2, 1.2, 1.6, 1.6, 1.6, 1.2, 1.2, 2.0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
    focusX: interpolate(
      frame,
      [0, 110, 170, 195, 245, 330, 400, 500, 560, 620, 955, 1075],
      [800, 800, 920, 920, 800, 800, 990, 990, 990, 800, 800, 624],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
    focusY: interpolate(
      frame,
      // At zoom 1.6 focusY is bounded to 337-712: below that the top of the app
      // lifts clear of the frame, above it the bottom does. The 430-to-560
      // drift walks down the panel's list of recommended methods inside that
      // window.
      [0, 110, 170, 195, 245, 330, 400, 500, 560, 620, 955, 1075],
      [450, 450, 548, 548, 450, 450, 430, 430, 560, 450, 450, 285],
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
        opacity={interpolate(frame, [206, 212], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods"
        camera={camera}
        opacity={interpolate(frame, [645, 651], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods-f1"
        camera={camera}
        opacity={interpolate(frame, [741, 747], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods-f2"
        camera={camera}
        opacity={interpolate(frame, [801, 807], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <PageShot
        shot="policy-tool-methods-f3"
        camera={camera}
        opacity={interpolate(frame, [871, 877], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />

      <Cursor
        camera={camera}
        cssX={interpolate(
          frame,
          [120, 170, 275, 610, 640, 655, 735, 755, 795, 815, 867],
          [1150, 920, 920, 876, 876, 876, 76, 76, 73, 73, 67],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        )}
        cssY={interpolate(
          frame,
          [120, 170, 275, 610, 640, 655, 735, 755, 795, 815, 867],
          [700, 451, 451, 120, 34, 34, 257, 257, 430, 430, 537],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        )}
        click={interpolate(
          frame,
          [190, 208, 209, 640, 658, 659, 740, 758, 759, 800, 818, 819, 870, 888],
          [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )}
        // Off through beat 2's reading pause between the phase click and the tab
        // click — there is nothing for it to point at in between.
        opacity={interpolate(
          frame,
          [110, 130, 250, 275, 590, 610, 885, 911],
          [0, 1, 1, 0, 0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )}
      />

      <Caption
        // Two lines at 36px, so it is lifted clear of the frame edge: the pill
        // is anchored at y986 and a second line would otherwise run past 1080.
        translateY={-46}
        opacity={interpolate(frame, [10, 34, 180, 202], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        A living document to guide researchers in establishing policy labs within
        Agricultural Living Labs.
      </Caption>

      <Caption
        opacity={interpolate(frame, [212, 234, 330, 352], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Two different 'views': a concept diagram of the Policy Lab phases…
      </Caption>

      <Caption
        opacity={interpolate(frame, [380, 402, 566, 588], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Explore the goals of each phase, the typical actors involved and
        applicable methods
      </Caption>

      <Caption
        opacity={interpolate(frame, [600, 622, 933, 955], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        …and a method library, filterable by phase, actor, effort and skill
      </Caption>

      <Caption
        opacity={interpolate(frame, [971, 993], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        We plan to expand the methods library with additions from the IAT community
      </Caption>
    </AbsoluteFill>
  );
};
