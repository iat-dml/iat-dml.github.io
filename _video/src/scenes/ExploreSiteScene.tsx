import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { sans, serif } from "../fonts";

export const ExploreSiteScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Explore the site scene"
      style={{
        backgroundColor: "#F5F3EE",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 44,
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
        What you'll find on the site
      </Interactive.Div>

      <Interactive.Div
        name="Navbar pills"
        style={{
          display: "flex",
          gap: 18,
          opacity: interpolate(frame, [12, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [12, 40], ["0px 26px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            fontWeight: 500,
            color: "#465555",
            border: "2px solid rgba(70, 85, 85, 0.28)",
            borderRadius: 999,
            padding: "16px 30px",
          }}
        >
          Home
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            fontWeight: 500,
            color: "#465555",
            border: "2px solid rgba(70, 85, 85, 0.28)",
            borderRadius: 999,
            padding: "16px 30px",
          }}
        >
          Services
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            fontWeight: 500,
            color: "#465555",
            border: "2px solid rgba(70, 85, 85, 0.28)",
            borderRadius: 999,
            padding: "16px 30px",
          }}
        >
          Team
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            fontWeight: 500,
            color: "#465555",
            border: "2px solid rgba(70, 85, 85, 0.28)",
            borderRadius: 999,
            padding: "16px 30px",
          }}
        >
          Projects
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            fontWeight: 500,
            color: "#465555",
            border: "2px solid rgba(70, 85, 85, 0.28)",
            borderRadius: 999,
            padding: "16px 30px",
          }}
        >
          News
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            fontWeight: 500,
            color: "#465555",
            border: "2px solid rgba(70, 85, 85, 0.28)",
            borderRadius: 999,
            padding: "16px 30px",
          }}
        >
          Resources
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            fontWeight: 500,
            color: "#FFFFFF",
            backgroundColor: "#356259",
            border: "2px solid #356259",
            borderRadius: 999,
            padding: "16px 30px",
          }}
        >
          Contact
        </div>
      </Interactive.Div>

      <Interactive.Div
        name="Site qualities"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          marginTop: 16,
          opacity: interpolate(frame, [34, 58], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            fontFamily: sans,
            fontSize: 40,
            color: "#465555",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#2B5D45",
              flexShrink: 0,
            }}
          />
          Bilingual — every page in English and German
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            fontFamily: sans,
            fontSize: 40,
            color: "#465555",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#A4713D",
              flexShrink: 0,
            }}
          />
          Open by default — built with Quarto, source on GitHub, CC BY-NC-SA
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            fontFamily: sans,
            fontSize: 40,
            color: "#465555",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#3E7775",
              flexShrink: 0,
            }}
          />
          Accessible — WCAG 2.1 AA, light and dark themes, reduced motion
        </div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
