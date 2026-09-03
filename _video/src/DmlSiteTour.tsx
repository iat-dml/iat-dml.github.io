import { Series } from "remotion";
import { ContactScene } from "./scenes/ContactScene";
import { HomeScene } from "./scenes/HomeScene";
import { PolicyPageScene } from "./scenes/PolicyPageScene";
import { ResourcesScene } from "./scenes/ResourcesScene";

/**
 * 1920 frames at 30fps — 64 seconds exactly.
 *
 * Hard cuts, not crossfades: every scene draws the same browser window, so a cut
 * reads as navigating rather than as an edit.
 *
 * The Policy Lab Guide tool used to run full frame between the project page and
 * the resources page. It is its own video now — see PolicyLabGuideTour — so the
 * tour shows that the tool is embedded in the project page and moves on rather
 * than stopping to demonstrate it.
 *
 * Durations are inline here and in Root.tsx so Studio can edit them. Change one
 * and change the other, plus DmlSiteTour's own durationInFrames.
 */
export const DmlSiteTour: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={660} name="Home">
        <HomeScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={300} name="Policy Lab page">
        <PolicyPageScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={480} name="Resources">
        <ResourcesScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={480} name="Request support">
        <ContactScene />
      </Series.Sequence>
    </Series>
  );
};
