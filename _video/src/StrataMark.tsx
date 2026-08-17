import { Easing, interpolate, useCurrentFrame } from "remotion";

/**
 * The DML "strata" disc mark, rebuilt from assets/logos/dml-strata-deep.svg.
 *
 * Three soil strata sit inside a clipped disc, separated by masked-out seams:
 *   surface = Support (#2B5D45), mid = Transfer (#3E7775),
 *   deep    = Integration (#A4713D).
 *
 * The two lower strata slide up into place so the mark builds itself.
 * `idSuffix` keeps the clipPath/mask ids unique when two marks are on screen.
 */
export const StrataMark: React.FC<{
  size: number;
  idSuffix: string;
}> = ({ size, idSuffix }) => {
  const frame = useCurrentFrame();

  return (
    <svg viewBox="22 22 156 156" width={size} height={size}>
      <defs>
        <clipPath id={`strata-disc-${idSuffix}`}>
          <circle cx="100" cy="100" r="76" />
        </clipPath>
        <mask id={`strata-seams-${idSuffix}`}>
          <rect x="0" y="0" width="200" height="200" fill="white" />
          <path
            d="M 14 84 C 58 68, 122 98, 186 78"
            fill="none"
            stroke="black"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 14 124 C 70 138, 134 112, 186 126"
            fill="none"
            stroke="black"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <g
        clipPath={`url(#strata-disc-${idSuffix})`}
        mask={`url(#strata-seams-${idSuffix})`}
      >
        <circle cx="100" cy="100" r="76" fill="#2B5D45" />
        <path
          d="M 14 84 C 58 68, 122 98, 186 78 L 186 188 L 14 188 Z"
          fill="#3E7775"
          style={{
            translate: interpolate(frame, [0, 26], ["0px 130px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />
        <path
          d="M 14 124 C 70 138, 134 112, 186 126 L 186 188 L 14 188 Z"
          fill="#A4713D"
          style={{
            translate: interpolate(frame, [8, 34], ["0px 130px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />
      </g>
    </svg>
  );
};

/**
 * The reversed (paper) mark from assets/logos/dml-strata-reversed.svg — a solid
 * paper disc with the seams knocked out. This is the site's own treatment for
 * dark backgrounds, where the deep palette's strata lose contrast.
 */
export const StrataMarkReversed: React.FC<{
  size: number;
  idSuffix: string;
}> = ({ size, idSuffix }) => {
  const frame = useCurrentFrame();

  return (
    <svg viewBox="22 22 156 156" width={size} height={size}>
      <defs>
        <clipPath id={`strata-disc-${idSuffix}`}>
          <circle cx="100" cy="100" r="76" />
        </clipPath>
        <mask id={`strata-seams-${idSuffix}`}>
          <rect x="0" y="0" width="200" height="200" fill="white" />
          <path
            d="M 14 84 C 58 68, 122 98, 186 78"
            fill="none"
            stroke="black"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 14 124 C 70 138, 134 112, 186 126"
            fill="none"
            stroke="black"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <g
        clipPath={`url(#strata-disc-${idSuffix})`}
        mask={`url(#strata-seams-${idSuffix})`}
      >
        <circle cx="100" cy="100" r="76" fill="#F5F3EE" />
        <path
          d="M 14 84 C 58 68, 122 98, 186 78 L 186 188 L 14 188 Z"
          fill="#F5F3EE"
          style={{
            translate: interpolate(frame, [0, 26], ["0px 130px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />
        <path
          d="M 14 124 C 70 138, 134 112, 186 126 L 186 188 L 14 188 Z"
          fill="#F5F3EE"
          style={{
            translate: interpolate(frame, [8, 34], ["0px 130px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />
      </g>
    </svg>
  );
};
