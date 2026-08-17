import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadDmSerifDisplay } from "@remotion/google-fonts/DMSerifDisplay";

// The site's brand typography (light-brand.yml): DM Serif Display for
// headings, DM Sans for body and UI. DM Serif Display ships weight 400 only.
export const serif = loadDmSerifDisplay("normal", {
  weights: ["400"],
  subsets: ["latin"],
}).fontFamily;

export const sans = loadDmSans("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
}).fontFamily;
