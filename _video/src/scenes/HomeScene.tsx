import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BrowserFrame, FRAME_VIEWPORT } from "../BrowserFrame";
import { Caption } from "../Caption";
import { Cursor } from "../Cursor";
import { PageShot } from "../PageShot";

/**
 * Arrive on the home page, hold on the hero at 1:1, scroll past the concept
 * diagram (it has its own slide elsewhere in the deck), then settle on the News and
 * Projects columns — reading each in turn before clicking the Policy Lab Guide
 * card, which is what the next scene opens on.
 *
 * Page coordinates come from public/shots/manifest.json: hero y63-552, concept
 * diagram y732-1475, columns y1613-2915, News column centred x495, Projects
 * column centred x1105, third project card (Policy Lab Guide) y2457-2816.
 */
export const HomeScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera beats: settle → hero → scroll past the diagram → arrive at the
  // columns → into News → across to Projects → down to the Policy Lab card.
  const camera = {
    viewportWidth: FRAME_VIEWPORT.width,
    viewportHeight: FRAME_VIEWPORT.height,
    zoom: interpolate(
      frame,
      [0, 45, 130, 235, 315, 425, 545, 625],
      // The hero beat holds at 1.0. It used to push in to 1.12, but a move that
      // small reads as a wobble rather than as intent — the hero type is already
      // large on the page, so it needs no help. The first real zoom is the one
      // that lands on the columns.
      [1.0, 1.0, 1.0, 1.3, 1.3, 1.95, 1.95, 1.95],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
    focusX: interpolate(
      frame,
      [0, 45, 130, 235, 315, 425, 545, 625],
      [800, 800, 800, 800, 800, 495, 1105, 1105],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
    focusY: interpolate(
      frame,
      [0, 45, 130, 235, 315, 425, 545, 625],
      // focusY can never go below viewportHeight / (2 * zoom), or the top of
      // the page lifts clear of the viewport and leaves a blank strip. At the
      // hero's 1.0 that floor is 428, which is exactly where it sits.
      [428, 428, 428, 1100, 1900, 1860, 1860, 2620],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    ),
  };

  return (
    <AbsoluteFill name="Home scene" style={{ backgroundColor: "#F5F3EE" }}>
      <BrowserFrame
        url="iat-dml.github.io"
        opacity={interpolate(frame, [0, 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        <PageShot shot="home-full" camera={camera} />

        <Cursor
          camera={camera}
          cssX={interpolate(
            frame,
            [330, 400, 425, 545, 625],
            [980, 560, 560, 1105, 1105],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          )}
          cssY={interpolate(
            frame,
            [330, 400, 425, 545, 625],
            [1640, 1830, 1830, 1830, 2668],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          )}
          click={interpolate(frame, [628, 651, 652], [0, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
          opacity={interpolate(frame, [318, 342], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </BrowserFrame>

      <Caption
        opacity={interpolate(frame, [245, 268, 420, 442], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Follow our news and projects
      </Caption>

      <Caption
        opacity={interpolate(frame, [552, 574], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Each project has its own page
      </Caption>
    </AbsoluteFill>
  );
};
