/**
 * Homepage stills. Spec: MOTION.md.
 * Photos are wordless; URL / Live / labels stay HTML.
 */

export type ArtifactId =
  | "decks"
  | "docs"
  | "spreadsheets"
  | "video"
  | "websites"
  | "apps";

export type ArtifactState = "idle" | "working" | "done";

export const ARTIFACTS: Record<
  ArtifactId,
  { src: string; alt: string; label: string }
> = {
  decks: {
    src: "/visuals/artifact-deck.jpg",
    alt: "Fanned cream presentation boards on a lamplit desk",
    label: "Deck",
  },
  docs: {
    src: "/visuals/artifact-doc.jpg",
    alt: "A thick cream folio tied with a sage ribbon",
    label: "Doc",
  },
  spreadsheets: {
    src: "/visuals/artifact-sheet.jpg",
    alt: "An open ledger with honey-ruled columns",
    label: "Spreadsheet",
  },
  video: {
    src: "/visuals/artifact-video.jpg",
    alt: "A paper film-frame still under a brass lamp",
    label: "Video",
  },
  websites: {
    src: "/visuals/artifact-site.jpg",
    alt: "A letterpress window card on laid paper",
    label: "Website",
  },
  apps: {
    src: "/visuals/artifact-app.jpg",
    alt: "A wooden inlay board on the desk",
    label: "App & game",
  },
};

export const ARTIFACT_ORDER: ArtifactId[] = [
  "decks",
  "docs",
  "spreadsheets",
  "video",
  "websites",
  "apps",
];

export const DESK_ENSEMBLE = {
  src: "/visuals/desk-ensemble.jpg",
  alt: "One desk holding a deck, folio, ledger, film card, window card, and game board",
};
