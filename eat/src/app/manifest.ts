import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eat — live deals, nearby, now",
    short_name: "Eat",
    description: "What's worth eating near you, right now, at a price worth walking for.",
    start_url: "/",
    display: "standalone",
    background_color: "#171310",
    theme_color: "#171310",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
