import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";

export const WhereWeSitScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Where we sit scene"
      style={{
        backgroundColor: "#F5F3EE",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        padding: 120,
      }}
    >
      <Interactive.Div
        name="Eyebrow"
        style={{
          fontFamily: sans,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: 7,
          textTransform: "uppercase",
          color: "#3E7775",
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Where we sit
      </Interactive.Div>

      <Interactive.Div
        name="ZALF ring"
        style={{
          width: 1400,
          border: "3px solid rgba(70, 85, 85, 0.3)",
          borderRadius: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          padding: 44,
          opacity: interpolate(frame, [4, 26], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: interpolate(frame, [4, 30], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontSize: 36,
            fontWeight: 500,
            color: "#465555",
          }}
        >
          Leibniz Centre for Agricultural Landscape Research (ZALF)
        </div>

        <Interactive.Div
          name="IAT ring"
          style={{
            width: 1140,
            border: "3px solid #3E7775",
            borderRadius: 34,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
            padding: 38,
            opacity: interpolate(frame, [18, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            scale: interpolate(frame, [18, 44], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 36,
              fontWeight: 500,
              color: "#3E7775",
              textAlign: "center",
            }}
          >
            Innovation Center for Agricultural System Transformation (IAT)
          </div>

          <Interactive.Div
            name="DML card"
            style={{
              width: 880,
              backgroundColor: "#2B5D45",
              borderRadius: 26,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "34px 30px",
              opacity: interpolate(frame, [32, 54], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
              scale: interpolate(frame, [32, 58], [0.86, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                output: "perceptual-scale",
              }),
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 86, color: "#FFFFFF" }}>
              DML
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 32,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.85)",
                textAlign: "center",
              }}
            >
              Data and Modelling Infrastructure for Living Labs
            </div>
          </Interactive.Div>
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
