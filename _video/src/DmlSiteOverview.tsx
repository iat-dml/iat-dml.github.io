import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { ContactScene } from "./scenes/ContactScene";
import { ExploreSiteScene } from "./scenes/ExploreSiteScene";
import { MissionScene } from "./scenes/MissionScene";
import { PillarsScene } from "./scenes/PillarsScene";
import { ProjectsScene } from "./scenes/ProjectsScene";
import { SupportTiersScene } from "./scenes/SupportTiersScene";
import { TitleScene } from "./scenes/TitleScene";
import { WhereWeSitScene } from "./scenes/WhereWeSitScene";

// 8 scenes summing to 1410 frames, joined by 7 × 15-frame crossfades,
// so the composition is 1410 - 105 = 1305 frames (43.5s at 30fps).
export const DmlSiteOverview: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={150} name="Title">
        <TitleScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={120} name="Where we sit">
        <WhereWeSitScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={90} name="Mission">
        <MissionScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={270} name="Three pillars">
        <PillarsScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={240} name="Support tiers">
        <SupportTiersScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={180} name="Explore the site">
        <ExploreSiteScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={210} name="Projects">
        <ProjectsScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={150} name="Contact">
        <ContactScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
