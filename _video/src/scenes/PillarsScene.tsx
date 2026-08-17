import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";

export const PillarsScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Three pillars scene"
      style={{
        backgroundColor: "#F5F3EE",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 30,
        padding: 120,
      }}
    >
      <Interactive.Div
        name="Heading"
        style={{
          fontFamily: serif,
          fontSize: 76,
          color: "#356259",
          marginBottom: 14,
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Three pillars of service
      </Interactive.Div>

      <Interactive.Div
        name="Pillar — Support"
        style={{
          width: 1560,
          display: "flex",
          alignItems: "center",
          gap: 40,
          backgroundColor: "rgba(43, 93, 69, 0.08)",
          borderLeft: "14px solid #2B5D45",
          borderRadius: 20,
          padding: "34px 48px",
          opacity: interpolate(frame, [10, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [10, 40], ["-70px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            fontFamily: serif,
            fontSize: 66,
            color: "#2B5D45",
            width: 340,
            flexShrink: 0,
          }}
        >
          Support
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 38,
            lineHeight: 1.35,
            color: "#465555",
          }}
        >
          Data management plans, version control, FAIR archiving, training and
          consulting.
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Pillar — Integration"
        style={{
          width: 1560,
          display: "flex",
          alignItems: "center",
          gap: 40,
          backgroundColor: "rgba(164, 113, 61, 0.1)",
          borderLeft: "14px solid #A4713D",
          borderRadius: 20,
          padding: "34px 48px",
          opacity: interpolate(frame, [28, 52], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [28, 58], ["-70px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            fontFamily: serif,
            fontSize: 66,
            color: "#A4713D",
            width: 340,
            flexShrink: 0,
          }}
        >
          Integration
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 38,
            lineHeight: 1.35,
            color: "#465555",
          }}
        >
          Shared infrastructure, interoperable methods and models, common
          standards across working groups.
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Pillar — Transfer"
        style={{
          width: 1560,
          display: "flex",
          alignItems: "center",
          gap: 40,
          backgroundColor: "rgba(62, 119, 117, 0.1)",
          borderLeft: "14px solid #3E7775",
          borderRadius: 20,
          padding: "34px 48px",
          opacity: interpolate(frame, [46, 70], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [46, 76], ["-70px 0px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            fontFamily: serif,
            fontSize: 66,
            color: "#3E7775",
            width: 340,
            flexShrink: 0,
          }}
        >
          Transfer
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 38,
            lineHeight: 1.35,
            color: "#465555",
          }}
        >
          Dashboards and web tools, stakeholder co-design, Living Lab feedback
          loops.
        </div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
