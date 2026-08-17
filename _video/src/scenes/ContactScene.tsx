import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";
import { StrataMarkReversed } from "../StrataMark";

export const ContactScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Contact scene"
      style={{
        backgroundColor: "#356259",
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
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: interpolate(frame, [0, 26], [0.7, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        <StrataMarkReversed size={160} idSuffix="contact" />
      </Interactive.Div>

      <Interactive.Div
        name="Call to action"
        style={{
          fontFamily: serif,
          fontSize: 104,
          lineHeight: 1.14,
          color: "#F5F3EE",
          textAlign: "center",
          maxWidth: 1500,
          opacity: interpolate(frame, [10, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [10, 40], ["0px 30px", "0px 0px"], {
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
          opacity: interpolate(frame, [30, 54], [0, 1], {
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
          opacity: interpolate(frame, [48, 72], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        IAT · ZALF · Leibniz Association
      </Interactive.Div>
    </AbsoluteFill>
  );
};
