import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { BrowserFrame, FRAME_VIEWPORT } from "../BrowserFrame";
import { Caption } from "../Caption";
import { Cursor } from "../Cursor";
import { PageShot } from "../PageShot";
import { StrataMarkReversed } from "../StrataMark";
import { sans, serif } from "../fonts";

/**
 * The way in: the Request Support page with its Microsoft Forms embed, then the
 * two alternatives (email, GitHub service desk), then the end card.
 *
 * The cursor rests on the form but never presses anything — the capture script
 * never submits the form either.
 *
 * The final frame is what stays on screen while the presenter keeps talking, so
 * it has to work as a static end card on its own.
 *
 * Measured page coordinates: h1 y93, callout y215, form iframe (233,276)
 * 895x800, "Prefer email?" y1093, the address y1153, "Already have a GitHub
 * account?" y1258, the service-desk link y1318.
 */
export const ContactScene: React.FC = () => {
  const frame = useCurrentFrame();

  const camera = {
    viewportWidth: FRAME_VIEWPORT.width,
    viewportHeight: FRAME_VIEWPORT.height,
    zoom: interpolate(frame, [0, 40, 140, 260, 350], [1.0, 1.0, 1.75, 1.4, 1.75], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
    focusX: interpolate(frame, [0, 40, 140], [800, 800, 680], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
    focusY: interpolate(frame, [0, 40, 140, 260, 350], [428, 428, 300, 700, 1200], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  };

  return (
    <AbsoluteFill name="Contact scene" style={{ backgroundColor: "#F5F3EE" }}>
      <BrowserFrame url="iat-dml.github.io/contact-form">
        <PageShot shot="contact-full" camera={camera} />

        <Cursor
          camera={camera}
          cssX={interpolate(frame, [150, 215], [900, 520], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })}
          cssY={interpolate(frame, [150, 215], [820, 470], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })}
          opacity={interpolate(frame, [145, 168, 250, 268], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </BrowserFrame>

      <Caption
        opacity={interpolate(frame, [52, 74, 140, 160], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Request Support — no account of any kind required
      </Caption>

      <Caption
        opacity={interpolate(frame, [170, 192, 252, 272], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        A short form that lands straight in our service desk
      </Caption>

      <Caption
        opacity={interpolate(frame, [282, 304, 340, 356], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
      >
        Or email us — or open an issue on GitHub
      </Caption>

      {/* End card. Holds as the last frame of the video. */}
      <AbsoluteFill
        name="End card"
        style={{
          backgroundColor: "#356259",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 34,
          padding: 120,
          opacity: interpolate(frame, [352, 402], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <StrataMarkReversed size={150} idSuffix="endcard" />

        <Interactive.Div
          name="Call to action"
          style={{
            fontFamily: serif,
            fontSize: 104,
            lineHeight: 1.14,
            color: "#F5F3EE",
            textAlign: "center",
            maxWidth: 1500,
            opacity: interpolate(frame, [372, 412], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Discuss your project with us
        </Interactive.Div>

        <Interactive.Div
          name="Links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginTop: 10,
            opacity: interpolate(frame, [392, 432], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 44,
              fontWeight: 500,
              color: "#356259",
              backgroundColor: "#B1BE4D",
              borderRadius: 999,
              padding: "20px 44px",
            }}
          >
            iat-dml.github.io
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 44,
              fontWeight: 500,
              color: "#F5F3EE",
              border: "2px solid rgba(245, 243, 238, 0.45)",
              borderRadius: 999,
              padding: "20px 44px",
            }}
          >
            iat-dml@zalf.de
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Institutions"
          style={{
            fontFamily: sans,
            fontSize: 30,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(245, 243, 238, 0.65)",
            marginTop: 24,
            opacity: interpolate(frame, [412, 452], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          IAT · ZALF · Leibniz Association
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
