"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion";
import { cx } from "@/lib/cx";

const CX = 230;
const CY = 180;
const RADIUS = 112;

interface PlatformDef {
  id: string;
  name: string;
  dx: number;
  dy: number;
  petalIndex: number;
  accentColor: string;
}

const PLATFORMS: PlatformDef[] = [
  {
    id: "web",
    name: "Web",
    dx: 0,
    dy: -RADIUS,
    petalIndex: 1,
    accentColor: "#f7c14c", // Honey gold
  },
  {
    id: "macos",
    name: "macOS",
    dx: Math.round(RADIUS * Math.cos(Math.PI / 6)),
    dy: -Math.round(RADIUS * Math.sin(Math.PI / 6)),
    petalIndex: 0,
    accentColor: "#74926b", // Sage green
  },
  {
    id: "windows",
    name: "Windows",
    dx: Math.round(RADIUS * Math.cos(Math.PI / 6)),
    dy: Math.round(RADIUS * Math.sin(Math.PI / 6)),
    petalIndex: 4,
    accentColor: "#34905e", // Emerald
  },
  {
    id: "linux",
    name: "Linux",
    dx: 0,
    dy: RADIUS,
    petalIndex: 5,
    accentColor: "#9bb289", // Light sage
  },
  {
    id: "android",
    name: "Android",
    dx: -Math.round(RADIUS * Math.cos(Math.PI / 6)),
    dy: Math.round(RADIUS * Math.sin(Math.PI / 6)),
    petalIndex: 3,
    accentColor: "#f8dc8d", // Pale gold
  },
  {
    id: "ios",
    name: "iOS",
    dx: -Math.round(RADIUS * Math.cos(Math.PI / 6)),
    dy: -Math.round(RADIUS * Math.sin(Math.PI / 6)),
    petalIndex: 2,
    accentColor: "#e6981a", // Amber
  },
];

const PETAL_PATHS = [
  {
    n: 0,
    fill: "#74926b",
    d: "m 114.51276,94.26887 c 3.89132,-5.66186 10.64797,-10.09602 15.25668,-11.09926 1.52085,-0.25236 3.80718,-0.49722 3.68969,1.11549 -0.48624,5.52377 -0.97247,11.537445 -1.45871,12.871003 -1.82182,4.825317 -4.18703,4.683557 -6.4355,4.290337 -4.87441,-1.10857 -7.48031,-2.44398 -10.1252,-3.775496 -1.77053,-1.017281 -1.5627,-2.396164 -0.92696,-3.402074 z",
  },
  {
    n: 1,
    fill: "#f7c14c",
    d: "m 137.9658,82.64489 c 6.84898,0.53905 14.0674,4.1734 17.24058,7.66304 0.97898,1.19092 2.3342,3.04851 0.8788,3.75311 -5.02684,2.340792 -10.47795,4.926542 -11.87597,5.172225 -5.08976,0.834915 -6.14959,-1.284294 -6.93329,-3.428139 C 135.79876,91.02948 135.65232,88.105 135.483,85.1487 c -0.004,-2.04197 1.29379,-2.55142 2.4828,-2.50381 z",
  },
  {
    n: 2,
    fill: "#e6981a",
    d: "m 159.75898,97.143829 c 2.95766,6.200911 3.41943,14.269421 1.98391,18.762301 -0.54188,1.44328 -1.47299,3.54573 -2.81089,2.63762 -4.54061,-3.18298 -9.50549,-6.6109 -10.41726,-7.69878 -3.26795,-3.99041 -1.96257,-5.96785 -0.4978,-7.71848 3.39725,-3.667078 5.85671,-5.256139 8.33228,-6.880924 1.7664,-1.024446 2.85649,-0.155255 3.40976,0.898263 z",
  },
  {
    n: 3,
    fill: "#f8dc8d",
    d: "m 158.09913,123.26675 c -3.89132,5.66186 -10.64797,10.09602 -15.25668,11.09926 -1.52086,0.25236 -3.80719,0.49722 -3.68969,-1.11549 0.48624,-5.52377 0.97246,-11.53745 1.4587,-12.871 1.82183,-4.82533 4.18703,-4.68356 6.43551,-4.29034 4.87441,1.10856 7.4803,2.44398 10.12519,3.7755 1.7704,1.01752 1.5627,2.39616 0.92697,3.40207 z",
  },
  {
    n: 4,
    fill: "#34905e",
    d: "m 134.64608,134.89073 c -6.84897,-0.53905 -14.06739,-4.1734 -17.24058,-7.66304 -0.97897,-1.19092 -2.33419,-3.04851 -0.8788,-3.75311 5.02685,-2.34079 10.47796,-4.92654 11.87597,-5.17223 5.08976,-0.83491 6.14959,1.2843 6.93329,3.42814 1.47716,4.77565 1.6236,7.70013 1.79292,10.65643 0.004,2.04197 -1.29379,2.55142 -2.4828,2.50381 z",
  },
  {
    n: 5,
    fill: "#9bb289",
    d: "m 112.8529,120.39179 c -2.95766,-6.20091 -3.41943,-14.26942 -1.9839,-18.7623 0.54188,-1.44328 1.47299,-3.545727 2.81088,-2.63762 4.54061,3.18299 9.5055,6.61091 10.41727,7.69878 3.26794,3.9904 1.96256,5.96785 0.49779,7.71847 -3.39725,3.66708 -5.85671,5.25615 -8.33228,6.88093 -1.76639,1.02445 -2.85649,0.15526 -3.40976,-0.89826 z",
  },
];

/**
 * MultiDeviceConstellation — Streamlined scroll-driven SVG illustration representing
 * persistent Allr workspace access across Web, macOS, Windows, Linux, Android, and iOS.
 * The 6 platform icons radiate outward from behind the central Allr mark as the user scrolls.
 */
export function MultiDeviceConstellation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Initial state: hidden behind the center logo
        PLATFORMS.forEach((_, i) => {
          gsap.set(`.platform-node-${i}`, {
            x: 0,
            y: 0,
            scale: 0.15,
            opacity: 0,
            transformOrigin: "center center",
          });
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: "top 98%",
            end: "center 75%",
            scrub: 0.4,
          },
        });

        // 1. Platform icons emerge and radiate outward from behind the Allr logo
        PLATFORMS.forEach((p, i) => {
          tl.to(
            `.platform-node-${i}`,
            {
              x: p.dx,
              y: p.dy,
              scale: 1,
              opacity: 1,
              duration: 1,
              ease: "power3.out",
            },
            0.04 * i,
          );
        });

        // 2. Subtle harmonic rotation of the central Allr petals
        tl.to(
          "#center-allr-petals-rotator",
          {
            rotation: 60,
            transformOrigin: "center center",
            duration: 1.2,
            ease: "power2.out",
          },
          0,
        );
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="relative mx-auto my-4 flex w-full max-w-[560px] items-center justify-center select-none"
    >
      <svg
        viewBox="0 0 460 360"
        className="w-full h-auto overflow-visible"
        aria-label="Allr multi-platform support constellation illustration"
      >
        {/* 1. Platform Nodes (Parent group centered at CX, CY so GSAP (x,y) radiates from center) */}
        <g id="platform-nodes-group" transform={`translate(${CX}, ${CY})`}>
          {PLATFORMS.map((p, i) => {
            const isHovered = hoveredPlatform === p.id;
            return (
              <g
                key={p.id}
                className={cx(
                  "platform-node",
                  `platform-node-${i}`,
                  "cursor-pointer transition-all duration-200",
                )}
                onMouseEnter={() => setHoveredPlatform(p.id)}
                onMouseLeave={() => setHoveredPlatform(null)}
                aria-label={p.name}
                role="img"
                fill={isHovered ? p.accentColor : "#223b33"}
                stroke={isHovered ? p.accentColor : "#223b33"}
              >
                <PlatformGlyph id={p.id} />
              </g>
            );
          })}
        </g>

        {/* 2. Central Allr Logo */}
        <g id="center-allr-logo" transform={`translate(${CX}, ${CY})`}>
          <g id="center-allr-petals-rotator">
            <g transform="scale(2.05) translate(-136.3059, -108.7678)">
              {PETAL_PATHS.map((petal) => {
                const matchingPlatform = PLATFORMS.find((p) => p.petalIndex === petal.n);
                const isHighlighted = hoveredPlatform === matchingPlatform?.id;
                return (
                  <path
                    key={petal.n}
                    d={petal.d}
                    fill={petal.fill}
                    opacity={hoveredPlatform ? (isHighlighted ? 1 : 0.45) : 1}
                    className="transition-opacity duration-200"
                  />
                );
              })}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Official Phosphor Icons (Bold weight on 256x256 grid, scaled to 36px) */
function PlatformGlyph({ id }: { id: string }) {
  const size = 36;
  const half = size / 2;
  const scale = size / 256;
  switch (id) {
    case "web":
      return (
        <g transform={`translate(-${half}, -${half}) scale(${scale})`}>
          <path
            d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,187a113.4,113.4,0,0,1-20.39-35h40.82a116.94,116.94,0,0,1-10,20.77A108.61,108.61,0,0,1,128,207Zm-26.49-59a135.42,135.42,0,0,1,0-40h53a135.42,135.42,0,0,1,0,40ZM44,128a83.49,83.49,0,0,1,2.43-20H77.25a160.63,160.63,0,0,0,0,40H46.43A83.49,83.49,0,0,1,44,128Zm84-79a113.4,113.4,0,0,1,20.39,35H107.59a116.94,116.94,0,0,1,10-20.77A108.61,108.61,0,0,1,128,49Zm50.73,59h30.82a83.52,83.52,0,0,1,0,40H178.75a160.63,160.63,0,0,0,0-40Zm20.77-24H173.71a140.82,140.82,0,0,0-15.5-34.36A84.51,84.51,0,0,1,199.52,84ZM97.79,49.64A140.82,140.82,0,0,0,82.29,84H56.48A84.51,84.51,0,0,1,97.79,49.64ZM56.48,172H82.29a140.82,140.82,0,0,0,15.5,34.36A84.51,84.51,0,0,1,56.48,172Zm101.73,34.36A140.82,140.82,0,0,0,173.71,172h25.81A84.51,84.51,0,0,1,158.21,206.36Z"
            fill="currentColor"
          />
        </g>
      );
    case "macos":
      return (
        <g transform={`translate(-${half}, -${half}) scale(${scale})`}>
          <path
            d="M227,168a12,12,0,0,0-4.21-5.09C207.25,152.22,204,133.68,204,120c0-16.17,12.68-30.6,20.25-37.76a12,12,0,0,0,0-17.43C210.89,52.17,188.81,44,168,44a76.29,76.29,0,0,0-40,11.37,75.59,75.59,0,0,0-93.58,11A78.64,78.64,0,0,0,12,123.51,131,131,0,0,0,53.43,216,43.81,43.81,0,0,0,83.6,228h87.69a43.87,43.87,0,0,0,32.05-13.85,127.63,127.63,0,0,0,18.4-25.39c1.57-2.88,3-5.71,4.14-8.41C227.47,176.67,229.12,172.87,227,168Zm-41.23,29.82A19.78,19.78,0,0,1,171.29,204H83.6a19.85,19.85,0,0,1-13.7-5.42A107.18,107.18,0,0,1,36,122.88,54.49,54.49,0,0,1,51.5,83.28,50.86,50.86,0,0,1,88,68h.72A51.5,51.5,0,0,1,120.48,79.4a12,12,0,0,0,15,0A51.41,51.41,0,0,1,168,68a67.24,67.24,0,0,1,29.88,7.4C186.26,89.66,180,105.13,180,120c0,23.33,7.47,42.89,21.25,56.19A103.3,103.3,0,0,1,185.76,197.81ZM128.75,13A43.83,43.83,0,0,1,142.17,1.51a12,12,0,0,1,11.64,21,19.84,19.84,0,0,0-6.11,5.24A12,12,0,0,1,128.75,13Z"
            fill="currentColor"
          />
        </g>
      );
    case "windows":
      return (
        <g transform={`translate(-${half}, -${half}) scale(${scale})`}>
          <path
            d="M99.69,51.88a12,12,0,0,0-9.84-2.6l-60,10.91A12,12,0,0,0,20,72v36a12,12,0,0,0,12,12H92a12,12,0,0,0,12-12V61.09A12,12,0,0,0,99.69,51.88ZM80,96H44V82l36-6.54ZM215.69,30.79a12,12,0,0,0-9.84-2.6L129.85,42A12,12,0,0,0,120,53.82V108a12,12,0,0,0,12,12h76a12,12,0,0,0,12-12V40A12,12,0,0,0,215.69,30.79ZM196,96H144V63.83l52-9.45ZM92,136H32a12,12,0,0,0-12,12v36a12,12,0,0,0,9.85,11.81l60,10.91A12,12,0,0,0,104,194.91V148A12,12,0,0,0,92,136ZM80,180.53,44,174V160H80ZM208,136H132a12,12,0,0,0-12,12v54.18A12,12,0,0,0,129.85,214l76,13.82A12,12,0,0,0,220,216V148A12,12,0,0,0,208,136Zm-12,65.62-52-9.45V160h52Z"
            fill="currentColor"
          />
        </g>
      );
    case "linux":
      return (
        <g transform={`translate(-${half}, -${half}) scale(${scale})`}>
          <path
            d="M231.49,217.38a12,12,0,0,1-16.89-1.9C213.19,213.72,180,171.24,180,88A52,52,0,1,0,76,88c0,83.24-33.21,125.72-34.62,127.48A12,12,0,0,1,22.6,200.53C23,200,52,162.06,52,88a76,76,0,1,1,152,0c0,74.19,29.1,112.16,29.4,112.54A12,12,0,0,1,231.49,217.38ZM104,120a16,16,0,1,0-16-16A16,16,0,0,0,104,120Zm64-16a16,16,0,1,0-16,16A16,16,0,0,0,168,104ZM95.26,155l28,12a12,12,0,0,0,9.45,0l28-12A12,12,0,0,0,151.26,133l-23.27,10-23.27-10A12,12,0,0,0,95.26,155ZM128,184a57.12,57.12,0,0,0-38.66,15.15,12,12,0,0,0,16.23,17.69,32.86,32.86,0,0,1,44.85,0,12,12,0,1,0,16.23-17.69A57.1,57.1,0,0,0,128,184Z"
            fill="currentColor"
          />
        </g>
      );
    case "android":
      return (
        <g transform={`translate(-${half}, -${half}) scale(${scale})`}>
          <path
            d="M180,148a16,16,0,1,1-16-16A16,16,0,0,1,180,148ZM92,132a16,16,0,1,0,16,16A16,16,0,0,0,92,132Zm152,28v24a20,20,0,0,1-20,20H32a20,20,0,0,1-20-20V161.13A117.35,117.35,0,0,1,45.72,78.69L23.51,56.49a12,12,0,0,1,17-17L64.3,63.33A114.35,114.35,0,0,1,127.59,44H128a115.15,115.15,0,0,1,63.89,19.14l23.62-23.63a12,12,0,0,1,17,17l-22,22A115.18,115.18,0,0,1,244,160Zm-24,0a92,92,0,0,0-92.33-92C77.12,68.18,36,110,36,161.13V180H220Z"
            fill="currentColor"
          />
        </g>
      );
    case "ios": {
      const iosScale = (size * 1.15) / 960;
      return (
        <g transform={`scale(${iosScale}) translate(-480, 480)`}>
          <path
            d="M160-600v-80h80v80h-80Zm0 320v-240h80v240h-80Zm280 0h-80q-33 0-56.5-23.5T280-360v-240q0-33 23.5-56.5T360-680h80q33 0 56.5 23.5T520-600v240q0 33-23.5 56.5T440-280Zm-80-80h80v-240h-80v240Zm200 80v-80h160v-80h-80q-33 0-56.5-23.5T560-520v-80q0-33 23.5-56.5T640-680h160v80H640v80h80q33 0 56.5 23.5T800-440v80q0 33-23.5 56.5T720-280H560Z"
            fill="currentColor"
          />
        </g>
      );
    }
    default:
      return null;
  }
}
