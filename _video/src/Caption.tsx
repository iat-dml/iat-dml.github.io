import { sans } from "./fonts";

/**
 * Lower-third label. These name what is on screen — the presenter does the
 * talking — but they also make the clip legible if the file is ever shared
 * without them.
 */
export const Caption: React.FC<{
  children: React.ReactNode;
  opacity: number;
  translateY?: number;
}> = ({ children, opacity, translateY = 0 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 986,
        width: 1920,
        display: "flex",
        justifyContent: "center",
        opacity,
        translate: `0px ${translateY}px`,
      }}
    >
      <div
        style={{
          fontFamily: sans,
          fontSize: 36,
          fontWeight: 500,
          color: "#F5F3EE",
          backgroundColor: "#356259",
          borderRadius: 999,
          padding: "13px 40px",
          maxWidth: 1560,
          textAlign: "center",
          boxShadow: "0 10px 26px rgba(53, 98, 89, 0.28)",
        }}
      >
        {children}
      </div>
    </div>
  );
};
