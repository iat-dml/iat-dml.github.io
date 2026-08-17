import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";

export const SupportTiersScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Support tiers scene"
      style={{
        backgroundColor: "#F5F3EE",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        padding: 120,
      }}
    >
      <Interactive.Div
        name="Heading"
        style={{
          fontFamily: serif,
          fontSize: 76,
          color: "#356259",
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Three tiers of support
      </Interactive.Div>

      <Interactive.Div
        name="Subheading"
        style={{
          fontFamily: sans,
          fontSize: 38,
          color: "#465555",
          marginBottom: 40,
          opacity: interpolate(frame, [8, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Pick the level of collaboration that fits your question and timeline.
      </Interactive.Div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <Interactive.Div
          name="Tier 01"
          style={{
            width: 500,
            height: 380,
            backgroundColor: "rgba(43, 93, 69, 0.08)",
            borderTop: "10px solid #2B5D45",
            borderRadius: "6px 6px 20px 20px",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: interpolate(frame, [22, 44], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [22, 50], ["0px 60px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#2B5D45",
            }}
          >
            01
          </div>
          <div style={{ fontFamily: serif, fontSize: 46, color: "#2B5D45" }}>
            Light-touch consultation
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#465555",
            }}
          >
            Hours to a few days — quick advice on well-scoped questions.
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Tier 02"
          style={{
            width: 500,
            height: 450,
            backgroundColor: "rgba(164, 113, 61, 0.1)",
            borderTop: "10px solid #A4713D",
            borderRadius: "6px 6px 20px 20px",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: interpolate(frame, [38, 60], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [38, 66], ["0px 60px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#A4713D",
            }}
          >
            02
          </div>
          <div style={{ fontFamily: serif, fontSize: 46, color: "#A4713D" }}>
            Direct assistance
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#465555",
            }}
          >
            Days to several weeks — hands-on implementation with agreed
            deliverables.
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Tier 03"
          style={{
            width: 500,
            height: 520,
            backgroundColor: "rgba(62, 119, 117, 0.12)",
            borderTop: "10px solid #3E7775",
            borderRadius: "6px 6px 20px 20px",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: interpolate(frame, [54, 76], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [54, 82], ["0px 60px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#3E7775",
            }}
          >
            03
          </div>
          <div style={{ fontFamily: serif, fontSize: 46, color: "#3E7775" }}>
            Structured project support
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#465555",
            }}
          >
            Months or longer — embedded collaboration across a project
            lifecycle, planned with in-kind funding.
          </div>
        </Interactive.Div>
      </div>
    </AbsoluteFill>
  );
};
