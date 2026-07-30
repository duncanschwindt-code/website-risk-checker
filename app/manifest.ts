import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Website Risk Checker",
    short_name: "Risk Checker",
    description:
      "Educational website risk-indicator checks from Teens Against Scams.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf6",
    theme_color: "#10243f",
  };
}
