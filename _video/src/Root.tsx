import { Composition, Folder } from "remotion";
import { DmlSiteTour } from "./DmlSiteTour";
import { PolicyLabGuideTour } from "./PolicyLabGuideTour";
import { ContactScene } from "./scenes/ContactScene";
import { HomeScene } from "./scenes/HomeScene";
import { PolicyPageScene } from "./scenes/PolicyPageScene";
import { PolicyToolScene } from "./scenes/PolicyToolScene";
import { ResourcesScene } from "./scenes/ResourcesScene";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DmlSiteTour"
        component={DmlSiteTour}
        durationInFrames={1920}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PolicyLabGuideTour"
        component={PolicyLabGuideTour}
        durationInFrames={780}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Scene1-Home"
          component={HomeScene}
          durationInFrames={660}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene2-PolicyPage"
          component={PolicyPageScene}
          durationInFrames={300}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="PolicyTool"
          component={PolicyToolScene}
          durationInFrames={780}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene3-Resources"
          component={ResourcesScene}
          durationInFrames={480}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene4-Contact"
          component={ContactScene}
          durationInFrames={480}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
