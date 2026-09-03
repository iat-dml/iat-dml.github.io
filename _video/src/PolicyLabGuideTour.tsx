import { Series } from "remotion";
import { PolicyToolScene } from "./scenes/PolicyToolScene";

/**
 * 780 frames at 30fps — 26 seconds. The Policy Lab Guide tool on its own,
 * lifted out of the site tour so it can carry its own slide.
 *
 * Full frame throughout: no browser chrome, because there is no navigation to
 * imply here — the whole point is the tool itself. It opens on the concept
 * diagram and ends held on the two methods that survive the filters, which is
 * what stays on screen while the presenter keeps talking.
 *
 * The site tour keeps the project page that embeds this tool (its camera drops
 * onto the live embed), so the two videos overlap by intent rather than by
 * accident: one shows that the tool is *there*, this one shows what it *does*.
 *
 * Duration is repeated in Root.tsx so Studio can edit it. Change one, change
 * the other.
 */
export const PolicyLabGuideTour: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={780} name="Policy Lab tool">
        <PolicyToolScene />
      </Series.Sequence>
    </Series>
  );
};
