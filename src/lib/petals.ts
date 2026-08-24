import type { ShowcaseId } from "@/lib/brand";

/**
 * The Bloom: six petals, six kinds of finished work. The mark is the product
 * map — every accent colour on the page is a petal, and every section is a
 * petal of Allr. Angles are the petals' centroid directions in the mark
 * (screen degrees, 0 = right, clockwise positive), 60° apart.
 */
export type Petal = {
  /** Index in the mark's petal order. */
  i: number;
  id: ShowcaseId;
  name: string;
  color: string;
  /** Text colour that reads on this petal. */
  on: "ink" | "paper";
  angle: number;
};

export const PETALS: readonly Petal[] = [
  { i: 0, id: "websites", name: "Sites", color: "#74926b", on: "paper", angle: -126 },
  { i: 1, id: "decks", name: "Decks", color: "#f7c14c", on: "ink", angle: -66 },
  { i: 2, id: "spreadsheets", name: "Sheets", color: "#e6981a", on: "ink", angle: -6 },
  { i: 3, id: "docs", name: "Docs", color: "#f8dc8d", on: "ink", angle: 54 },
  { i: 4, id: "video", name: "Video", color: "#34905e", on: "paper", angle: 114 },
  { i: 5, id: "apps", name: "Apps", color: "#9bb289", on: "ink", angle: 174 },
] as const;

export const PETAL_BY_ID: Record<ShowcaseId, Petal> = Object.fromEntries(
  PETALS.map((p) => [p.id, p]),
) as Record<ShowcaseId, Petal>;

/** Degrees to rotate the mark so petal `i` points at `target` (0 = right, -90 = up). */
export function rotationToPoint(i: number, target: number): number {
  return target - PETALS[i].angle;
}

/**
 * One petal's outline, normalised to a 1×1 box, pointing up. Sampled from the
 * honey petal in logo_base.svg. Natural aspect (w/h) is 1.46.
 */
export const PETAL_PATH =
  "M0.0679,0.0987 L0.1541,0.0603 L0.2431,0.0318 L0.3334,0.0125 L0.4237,0.0020 L0.5125,0.0000 L0.5985,0.0059 L0.6803,0.0194 L0.7565,0.0399 L0.8257,0.0671 L0.8865,0.1004 L0.9051,0.1144 L0.9243,0.1300 L0.9432,0.1471 L0.9609,0.1655 L0.9764,0.1850 L0.9887,0.2056 L0.9969,0.2271 L1.0000,0.2493 L0.9971,0.2721 L0.9873,0.2954 L0.9396,0.3753 L0.8919,0.4551 L0.8450,0.5332 L0.7998,0.6081 L0.7570,0.6781 L0.7174,0.7417 L0.6818,0.7973 L0.6510,0.8433 L0.6258,0.8780 L0.6070,0.9000 L0.5540,0.9457 L0.5069,0.9766 L0.4650,0.9941 L0.4279,1.0000 L0.3950,0.9958 L0.3655,0.9831 L0.3391,0.9635 L0.3150,0.9386 L0.2928,0.9099 L0.2718,0.8792 L0.2315,0.8097 L0.1958,0.7441 L0.1642,0.6819 L0.1362,0.6229 L0.1112,0.5664 L0.0887,0.5121 L0.0682,0.4595 L0.0491,0.4082 L0.0311,0.3577 L0.0134,0.3075 L0.0049,0.2737 L0.0007,0.2431 L0.0002,0.2155 L0.0032,0.1909 L0.0092,0.1692 L0.0176,0.1501 L0.0282,0.1337 L0.0404,0.1197 L0.0538,0.1081 L0.0679,0.0987 Z";

export const PETAL_ASPECT = 1.46;
