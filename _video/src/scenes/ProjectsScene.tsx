import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";

export const ProjectsScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Projects scene"
      style={{
        backgroundColor: "#F5F3EE",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 36,
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
        What we've been building
      </Interactive.Div>

      <div
        style={{
          width: 1600,
          display: "flex",
          flexWrap: "wrap",
          gap: 40,
          justifyContent: "center",
        }}
      >
        <Interactive.Div
          name="Project — Living Lab Explorer"
          style={{
            width: 760,
            backgroundColor: "#FFFFFF",
            border: "2px solid rgba(70, 85, 85, 0.14)",
            borderLeft: "12px solid #3E7775",
            borderRadius: 20,
            padding: "30px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: interpolate(frame, [12, 34], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [12, 40], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div style={{ fontFamily: serif, fontSize: 48, color: "#356259" }}>
            Living Lab Explorer
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 31,
              lineHeight: 1.35,
              color: "#465555",
            }}
          >
            Interactive dashboards for the environmental and socio-economic data
            of the five IAT Living Labs.
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Project — Policy Lab Guide"
          style={{
            width: 760,
            backgroundColor: "#FFFFFF",
            border: "2px solid rgba(70, 85, 85, 0.14)",
            borderLeft: "12px solid #A4713D",
            borderRadius: 20,
            padding: "30px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: interpolate(frame, [24, 46], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [24, 52], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div style={{ fontFamily: serif, fontSize: 48, color: "#356259" }}>
            Policy Lab Guide
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 31,
              lineHeight: 1.35,
              color: "#465555",
            }}
          >
            A concept diagram and searchable methods library for co-designing
            agri-environmental policy.
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Project — Quarto workshop"
          style={{
            width: 760,
            backgroundColor: "#FFFFFF",
            border: "2px solid rgba(70, 85, 85, 0.14)",
            borderLeft: "12px solid #2B5D45",
            borderRadius: 20,
            padding: "30px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: interpolate(frame, [36, 58], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [36, 64], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div style={{ fontFamily: serif, fontSize: 48, color: "#356259" }}>
            One Tool to Rule Them All
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 31,
              lineHeight: 1.35,
              color: "#465555",
            }}
          >
            A guided Quarto workshop, first run at iEMSs 2026 in Dublin.
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Project — MonksHillLab handbook"
          style={{
            width: 760,
            backgroundColor: "#FFFFFF",
            border: "2px solid rgba(70, 85, 85, 0.14)",
            borderLeft: "12px solid #B1BE4D",
            borderRadius: 20,
            padding: "30px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            opacity: interpolate(frame, [48, 70], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [48, 76], ["0px 40px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          <div style={{ fontFamily: serif, fontSize: 48, color: "#356259" }}>
            MonksHillLab Handbook
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 31,
              lineHeight: 1.35,
              color: "#465555",
            }}
          >
            A field ecophysiology PDF turned into a living, contributable web
            resource.
          </div>
        </Interactive.Div>
      </div>

      <Interactive.Div
        name="Footnote"
        style={{
          fontFamily: sans,
          fontSize: 32,
          color: "#6C6C6C",
          textAlign: "center",
          opacity: interpolate(frame, [62, 86], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        Plus ZALF and IAT presentation templates — and news from FAIRagro,
        Barcamp Open Science and iEMSs 2026.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
