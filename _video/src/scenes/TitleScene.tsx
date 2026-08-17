import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";
import { StrataMark } from "../StrataMark";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Title scene"
      style={{
        backgroundColor: "#F5F3EE",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 34,
        padding: 120,
      }}
    >
      <Interactive.Div
        name="Logo mark"
        style={{
          scale: interpolate(frame, [0, 24], [0.6, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
          opacity: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <StrataMark size={200} idSuffix="title" />
      </Interactive.Div>

      <Interactive.Div
        name="Eyebrow"
        style={{
          fontFamily: sans,
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: 7,
          textTransform: "uppercase",
          color: "#3E7775",
          opacity: interpolate(frame, [14, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        IAT Service Working Group
      </Interactive.Div>

      <Interactive.Div
        name="Title"
        style={{
          fontFamily: serif,
          fontSize: 116,
          lineHeight: 1.1,
          color: "#356259",
          textAlign: "center",
          maxWidth: 1500,
          opacity: interpolate(frame, [20, 44], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [20, 48], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Data and Modelling Infrastructure for Living Labs
      </Interactive.Div>

      <Interactive.Div
        name="Domain"
        style={{
          fontFamily: sans,
          fontSize: 38,
          fontWeight: 500,
          letterSpacing: 2,
          color: "#465555",
          borderTop: "2px solid rgba(70, 85, 85, 0.25)",
          paddingTop: 26,
          opacity: interpolate(frame, [40, 62], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        iat-dml.github.io
      </Interactive.Div>
    </AbsoluteFill>
  );
};
