import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";

export const MissionScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Mission scene"
      style={{
        backgroundColor: "#356259",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        padding: 140,
      }}
    >
      <Interactive.Div
        name="Eyebrow"
        style={{
          fontFamily: sans,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: "#B1BE4D",
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Our mission
      </Interactive.Div>

      <Interactive.Div
        name="Mission statement"
        style={{
          fontFamily: serif,
          fontSize: 96,
          lineHeight: 1.2,
          color: "#F5F3EE",
          textAlign: "center",
          maxWidth: 1520,
          opacity: interpolate(frame, [8, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [8, 40], ["0px 34px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        To support researchers and partners across the IAT with all things data
        and modelling.
      </Interactive.Div>

      <Interactive.Div
        name="Accent rule"
        style={{
          height: 8,
          backgroundColor: "#B1BE4D",
          borderRadius: 4,
          width: interpolate(frame, [26, 60], [0, 300], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      />
    </AbsoluteFill>
  );
};
