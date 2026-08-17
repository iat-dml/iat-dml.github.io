import { Composition, Folder } from "remotion";
import { DmlSiteOverview } from "./DmlSiteOverview";
import { ContactScene } from "./scenes/ContactScene";
import { ExploreSiteScene } from "./scenes/ExploreSiteScene";
import { MissionScene } from "./scenes/MissionScene";
import { PillarsScene } from "./scenes/PillarsScene";
import { ProjectsScene } from "./scenes/ProjectsScene";
import { SupportTiersScene } from "./scenes/SupportTiersScene";
import { TitleScene } from "./scenes/TitleScene";
import { WhereWeSitScene } from "./scenes/WhereWeSitScene";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DmlSiteOverview"
        component={DmlSiteOverview}
        durationInFrames={1305}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Scene1-Title"
          component={TitleScene}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene2-WhereWeSit"
          component={WhereWeSitScene}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene3-Mission"
          component={MissionScene}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene4-Pillars"
          component={PillarsScene}
          durationInFrames={270}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene5-SupportTiers"
          component={SupportTiersScene}
          durationInFrames={240}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene6-ExploreSite"
          component={ExploreSiteScene}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene7-Projects"
          component={ProjectsScene}
          durationInFrames={210}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene8-Contact"
          component={ContactScene}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
