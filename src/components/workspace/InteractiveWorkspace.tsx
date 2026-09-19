"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { SquirrelCompanion } from "@/components/ui/SquirrelCompanion";

export interface InteractiveWorkspaceProps {
  stepIndex: number;
  showPostOverlay?: boolean;
  onStepChange?: (index: number) => void;
  className?: string;
}

/**
 * InteractiveWorkspace — High-craft interactive simulation of the Allr desktop application.
 * Matches the actual Allr interface from desktop screenshots:
 * - Application titlebar & tabs
 * - Chat stream dynamically accumulating in a single continuous thread across all 6 story steps
 * - Real clickable URL for deploy step (neon-bitcrush.jai.allr.work)
 * - Animated WhatsApp toast notification fading in on operate step
 * - Live animated CRT oscilloscope and 4-channel VU meters on maintain step
 * - Dummy browser window overlay showing the live viral tweet on scale step
 * - Authentic animated squirrel companion mascot perched on the prompt bar
 * - Status bar with real telemetry tags
 */
export function InteractiveWorkspace({
  stepIndex,
  showPostOverlay = false,
  className,
}: InteractiveWorkspaceProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smooth auto-scroll to the current active step's message block.
  // Scrolls the chat container only — scrollIntoView would also scroll the
  // window, dragging the whole page down to this section on load.
  useEffect(() => {
    const target = stepRefs.current[stepIndex];
    const container = chatContainerRef.current;
    if (!target || !container) return;

    const top = target.offsetTop;
    const bottom = top + target.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    // Same result as block: "nearest", scoped to the container
    let next = viewTop;
    if (top < viewTop || target.offsetHeight > container.clientHeight) next = top;
    else if (bottom > viewBottom) next = bottom - container.clientHeight;

    if (next !== viewTop) container.scrollTo({ top: next, behavior: "smooth" });
  }, [stepIndex]);

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-panel border border-[#ded5c5] bg-[#fbf8f2] shadow-lift font-sans text-ink select-none sm:select-auto transition-all duration-300 w-full aspect-[2/3] sm:aspect-[4/3] max-w-[680px] mx-auto flex flex-col",
        className,
      )}
    >
      {/* 1. Top Window Chrome */}
      <WorkspaceTitlebar />

      {/* 2. Main Workspace Body with Single Scrollable Chat Stream */}
      <div className="relative flex-1 min-h-0 p-3 sm:p-4 flex flex-col justify-between bg-[#fbf9f4] overflow-hidden">
        {/* Continuous Accumulating Chat Container */}
        <div
          ref={chatContainerRef}
          className="relative z-10 flex-1 min-h-0 space-y-3.5 overflow-y-auto scroll-smooth pr-1 pb-2 [scrollbar-width:thin] [scrollbar-color:#ded5c5_transparent]"
        >
          {/* Step 00: Initial User Request & Ideate Clarification */}
          <div
            ref={(el) => {
              stepRefs.current[0] = el;
            }}
            className="space-y-3 transition-all duration-500 ease-out"
          >
            <UserMessage text="Let's start building a platform where I can show my music 8-bit music album" />
            <IdeateView />
          </div>

          {/* Step 01: Create (Code synthesis cards) */}
          {stepIndex >= 1 && (
            <div
              ref={(el) => {
                stepRefs.current[1] = el;
              }}
              className="space-y-3 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-3"
            >
              <UserMessage text="Go ahead and synthesize sample 8-bit tracks procedurally, then build the player UI and retro CRT audio visualizer" />
              <CreateView />
            </div>
          )}

          {/* Step 02: Deploy (Live clickable URL) */}
          {stepIndex >= 2 && (
            <div
              ref={(el) => {
                stepRefs.current[2] = el;
              }}
              className="space-y-3 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-3"
            >
              <UserMessage text="Everything looks great. Deploy the platform to a live showcase link so people can play it" />
              <DeployView />
            </div>
          )}

          {/* Step 03: Operate (Follow-up request & cron daemon) */}
          {stepIndex >= 3 && (
            <div
              ref={(el) => {
                stepRefs.current[3] = el;
              }}
              className="space-y-3 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-3"
            >
              <UserMessage text="Now create a backend process so that you can keep on recording the telemetrics and send me that image of the telemetrics on my whatsapp every 12 hours" />
              <OperateView />
            </div>
          )}

          {/* Step 04: Maintain (Continuous Telemetry Module) */}
          {stepIndex >= 4 && (
            <div
              ref={(el) => {
                stepRefs.current[4] = el;
              }}
              className="space-y-3 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-3"
            >
              <UserMessage text="Okay lets build the page analytics and verify automated telemetry recording" />
              <MaintainView />
            </div>
          )}

          {/* Step 05: Scale (Concluding milestone bridge) */}
          {stepIndex >= 5 && (
            <div
              ref={(el) => {
                stepRefs.current[5] = el;
              }}
              className="space-y-3 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-3"
            >
              <UserMessage text="Now make a post with an image so that I can tweet about this !" />
              <ScaleView />
            </div>
          )}
        </div>

        {/* 3. WhatsApp Notification Toast (Fades in on Step 04: Operate) */}
        <WhatsAppToast visible={stepIndex === 3} />

        {/* 4. Dummy Browser Window Overlay for Tweet (Step 06: Scale - Phase 2) */}
        <ScaleBrowserOverlay active={stepIndex === 5 && Boolean(showPostOverlay)} />

        {/* 5. Bottom Prompt Bar with Mascot */}
        <WorkspacePromptBar
          isInitial={stepIndex === 0}
          stepIndex={stepIndex}
          showPostOverlay={showPostOverlay}
        />
      </div>

      {/* 6. Application Status Footer */}
      <WorkspaceStatusBar />
    </div>
  );
}

/* =========================================================================
   Sub-Views for each Lifecycle Step
   ========================================================================= */

/** Reusable user prompt message card matching desktop application screenshot */
function UserMessage({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[#e3dac9] bg-[#f5efe2] p-3 shadow-xs text-left">
      <p className="font-mono text-[.72rem] uppercase tracking-wider text-ink-soft mb-1 flex items-center gap-1.5 font-bold">
        <span className="size-1.5 rounded-full bg-honey" />
        User Request
      </p>
      <p className="text-[.92rem] font-medium text-ink leading-snug">
        {text}
      </p>
    </div>
  );
}

/** Step 01: Ideate — Agent reasoning and clarification question */
function IdeateView() {
  return (
    <div className="space-y-3 text-[.85rem]">
      {/* Collapsed Thought Pills */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-[.75rem] text-ink-soft">
        <span className="inline-flex items-center gap-1 rounded bg-[#ece4d4] px-2 py-0.5">
          Thought for 4s <ChevronRightIcon />
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-[#ece4d4] px-2 py-0.5">
          Used 3 tools
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-[#ece4d4] px-2 py-0.5">
          Thought for 3s <ChevronRightIcon />
        </span>
      </div>

      {/* Interactive Clarification Question Box */}
      <div className="rounded-xl border border-honey-line bg-card/80 p-3.5 sm:p-4 shadow-soft">
        <p className="font-semibold text-ink text-[.92rem] mb-2.5 flex items-center justify-between">
          <span>Do you already have audio files to showcase, or should we synthesize/procedurally generate 8-bit tracks?</span>
          <span className="font-mono text-xs text-honey-deep bg-honey-tint px-2 py-0.5 rounded-chip">Clarification</span>
        </p>

        <div className="rounded-lg border border-green-line bg-green-tint/40 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-full bg-green text-[10px] text-white">✓</span>
            <span className="text-[.88rem] font-medium text-ink">Synthesize sample 8-bit tracks procedurally</span>
          </div>
          <span className="font-mono text-[.72rem] text-green-deep">Selected</span>
        </div>
      </div>

      {/* Active Thinking State */}
      <div className="flex items-center gap-2 text-ink-soft text-[.82rem] font-mono pt-1">
        <span className="inline-block animate-spin text-honey text-sm">∿</span>
        <span>Thinking (4s) — composing audio engine spec & architecture...</span>
      </div>
    </div>
  );
}

/** Step 02: Create — Code generation cards and terminal command execution */
function CreateView() {
  return (
    <div className="space-y-3 text-[.84rem]">
      {/* Code Generation Cards */}
      <div className="grid gap-2.5">
        {/* index.html */}
        <div className="rounded-lg border border-[#ded5c5] bg-[#1a201d] text-[#e0e8e4] p-3 shadow-xs font-mono text-[.76rem]">
          <div className="flex items-center justify-between border-b border-[#2d3832] pb-1.5 mb-2 text-[#9bb289]">
            <span className="flex items-center gap-1.5 font-bold">
              <span>&lt;/&gt;</span> index.html <span className="text-[#647c6e]">+78</span>
            </span>
            <span className="text-[10px] text-[#647c6e]">Synthesizer Canvas Shell</span>
          </div>
          <p className="text-[#a4b8aa] leading-relaxed line-clamp-2">
            &lt;title&gt;NEON BITCRUSH // 8-Bit Chiptune Album&lt;/title&gt;<br />
            &lt;div id=&quot;oscilloscope-viewport&quot; class=&quot;crt-scanlines phosphor-cyan&quot;&gt;&lt;/div&gt;
          </p>
        </div>

        {/* style.css */}
        <div className="rounded-lg border border-[#ded5c5] bg-[#1a201d] text-[#e0e8e4] p-3 shadow-xs font-mono text-[.76rem]">
          <div className="flex items-center justify-between border-b border-[#2d3832] pb-1.5 mb-2 text-[#9bb289]">
            <span className="flex items-center gap-1.5 font-bold">
              <span>#</span> style.css <span className="text-[#647c6e]">+78</span>
            </span>
            <span className="text-[10px] text-[#647c6e]">Retro CRT Shader Tokens</span>
          </div>
          <p className="text-[#a4b8aa] leading-relaxed line-clamp-2">
            :root &#123; --bg-void: #090a10; --accent-cyan: #00f0ff; --surface-card: #161926; &#125;<br />
            .crt-phosphor &#123; filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.45)); &#125;
          </p>
        </div>

        {/* app.js */}
        <div className="rounded-lg border border-[#ded5c5] bg-[#1a201d] text-[#e0e8e4] p-3 shadow-xs font-mono text-[.76rem]">
          <div className="flex items-center justify-between border-b border-[#2d3832] pb-1.5 mb-2 text-[#9bb289]">
            <span className="flex items-center gap-1.5 font-bold">
              <span>&lt;/&gt;</span> app.js <span className="text-[#647c6e]">+78</span>
            </span>
            <span className="text-[10px] text-[#647c6e]">Web Audio 2A03 Engine</span>
          </div>
          <p className="text-[#a4b8aa] leading-relaxed line-clamp-2">
            const TRACKS = [&#123; id: 0, title: &apos;Midnight Cyberdrive&apos;, bpm: 130, key: &apos;F Minor&apos; &#125;, ...];<br />
            const audioCore = new NES2A03Synthesizer(&#123; sampleRate: 44100 &#125;);
          </p>
        </div>
      </div>

      {/* Terminal Command Execution */}
      <div className="rounded-md border border-[#ded5c5] bg-[#ece5d5] px-3 py-1.5 font-mono text-[.75rem] text-ink flex items-center justify-between">
        <span className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-green-deep">&gt;</span>
          <span>Ran ls -la /opt/data/album-platform/dist</span>
        </span>
        <span className="text-ink-soft text-[10px]">127ms</span>
      </div>
    </div>
  );
}

/** Step 03: Deploy — Built, live showcase with REAL CLICKABLE URL */
function DeployView() {
  return (
    <div className="space-y-3.5 text-[.85rem]">
      {/* Live Notice */}
      <div className="flex items-center gap-2">
        <span className="flex size-2 rounded-full bg-green animate-pulse" />
        <p className="font-semibold text-ink text-[.94rem]">
          Your 8-bit music album platform <span className="font-bold text-green-deep">NEON BITCRUSH</span> is built and live.
        </p>
      </div>

      {/* The Clickable Live URL Card */}
      <div className="rounded-card border-2 border-green-line bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[.75rem] font-bold uppercase tracking-wider text-green-deep flex items-center gap-1.5">
            <span>🌐</span> Live Showcase URL
          </span>
          <span className="rounded-chip bg-green-tint px-2 py-0.5 font-mono text-[.7rem] font-bold text-green-deep flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-green" /> ONLINE
          </span>
        </div>

        {/* Real Clickable Link to the actual deployed app */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-paper p-3 border border-line-soft">
          <div className="min-w-0">
            <span className="block text-[.75rem] text-ink-soft font-mono">App URL</span>
            <a
              href="https://neon-bitcrush.jai.allr.work"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[.92rem] font-bold text-green-deep hover:text-green underline underline-offset-4 break-all transition-colors group"
            >
              <span>https://neon-bitcrush.jai.allr.work</span>
              <span className="text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </a>
          </div>

          <a
            href="https://neon-bitcrush.jai.allr.work"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-control bg-green px-3.5 py-1.5 font-mono text-[.78rem] font-bold text-white shadow-xs hover:bg-green-deep transition-all cursor-pointer"
          >
            <span>Open App</span>
            <span>↗</span>
          </a>
        </div>

        <p className="mt-2 font-mono text-[.72rem] text-ink-soft">
          Slug: <span className="bg-paper px-1.5 py-0.5 rounded border border-line-soft">neon-bitcrush</span>
        </p>
      </div>

      {/* Feature recap checklist */}
      <div className="rounded-lg border border-line-soft bg-paper/70 p-3 text-[.8rem] space-y-1.5">
        <p className="font-bold text-ink flex items-center gap-1.5">
          <span>🕹️</span> Synthesized Architecture
        </p>
        <ul className="text-ink-soft space-y-1 pl-5 list-disc">
          <li><strong>4-Channel 8-Bit Synthesizer Engine:</strong> Pulse 1 (Lead), Pulse 2 (Arp), Wave (Bass), Noise (Drums).</li>
          <li><strong>Tracklist:</strong> <em>Midnight Cyberdrive</em> (130 BPM), <em>Sky Sanctuary Arps</em>, <em>Boss Encounter</em>.</li>
          <li><strong>Retro Console:</strong> Real-time CRT visualizer, tactile cartridge bay, and live VU meters.</li>
        </ul>
      </div>
    </div>
  );
}

/** Step 04: Operate — WhatsApp integration request and cron scheduling */
function OperateView() {
  return (
    <div className="space-y-3 text-[.85rem]">
      {/* Operating CLI Execution Stack */}
      <div className="space-y-1.5 font-mono text-[.74rem] text-ink">
        <div className="rounded border border-[#ded5c5] bg-[#ece5d5] px-2.5 py-1.5 flex items-center justify-between">
          <span className="truncate">
            <span className="font-bold text-green-deep">&gt;</span> python3 -c &quot;import os; print(os.environ.get(&apos;ALLR_CONFIG&apos;))&quot;
          </span>
          <span className="text-ink-soft text-[10px]">6.0s</span>
        </div>

        <div className="rounded border border-[#ded5c5] bg-[#ece5d5] px-2.5 py-1.5 flex items-center justify-between">
          <span className="truncate">
            <span className="text-honey-deep">🔍</span> Searched files (50 totals)
          </span>
          <span className="text-ink-soft text-[10px]">286ms</span>
        </div>

        <div className="rounded border border-[#ded5c5] bg-[#ece5d5] px-2.5 py-1.5 flex items-center justify-between">
          <span className="truncate">
            <span className="text-ink-soft">📄</span> Read config.yaml L125-164
          </span>
          <span className="text-ink-soft text-[10px]">63ms</span>
        </div>

        <div className="rounded border border-[#ded5c5] bg-[#ece5d5] px-2.5 py-1.5 flex items-center justify-between">
          <span className="truncate">
            <span className="font-bold text-green-deep">&gt;</span> ls -la /opt/data/platforms/whatsapp/session
          </span>
          <span className="text-ink-soft text-[10px]">83ms</span>
        </div>

        <div className="rounded border border-green-line bg-green-tint/40 px-2.5 py-1.5 flex items-center justify-between text-green-deep font-semibold">
          <span className="flex items-center gap-1.5">
            <span>⏰</span> Cron job configured: every 12 hours (0 */12 * * *)
          </span>
          <span className="text-[10px]">4ms</span>
        </div>
      </div>
    </div>
  );
}

/** Step 05: Maintain — Telemetric Module with CRT waveform and VU meters */
function MaintainView() {
  return (
    <div className="space-y-3 text-[.85rem]">
      {/* Verification Notice */}
      <div className="flex items-center justify-between border-b border-line-soft pb-2">
        <p className="font-semibold text-ink text-[.9rem] flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green animate-pulse" />
          Continuous Telemetry &amp; Maintenance Active
        </p>
        <span className="font-mono text-[.72rem] text-ink-soft">Daemon: OK</span>
      </div>

      {/* The Telemetric Visualizer Card */}
      <div className="rounded-card border border-[#2d3832] bg-[#0c1015] p-3.5 text-white shadow-soft font-mono">
        {/* Telemetry Header */}
        <div className="flex items-center justify-between border-b border-[#1e2621] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#00f0ff] animate-ping" />
            <span className="text-xs font-bold text-[#00f0ff] tracking-wider">
              TELEMETRIC: NEON BITCRUSH // 2A03 CORE
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#9bb289]">
            <span className="bg-[#16201b] px-2 py-0.5 rounded border border-[#26372d]">44.1 kHz</span>
            <span className="bg-[#16201b] px-2 py-0.5 rounded border border-[#26372d] text-[#00f0ff]">ONLINE</span>
          </div>
        </div>

        {/* CRT Oscilloscope Waveform Display */}
        <div className="relative h-20 w-full overflow-hidden rounded bg-[#070b0d] border border-[#16292b] flex items-center justify-center p-2 mb-3">
          <div className="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(rgba(0,240,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.08)_1px,transparent_1px)] bg-[size:12px_12px]" />
          {/* Animated SVG Oscilloscope Wave */}
          <svg className="w-full h-12 stroke-[#00f0ff] fill-none" viewBox="0 0 300 60" preserveAspectRatio="none">
            <path
              d="M0,30 Q25,10 50,30 T100,30 T150,15 T200,45 T250,20 T300,30"
              strokeWidth="2.5"
              className="drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
            />
            <path
              d="M0,30 Q25,20 50,30 T100,30 T150,25 T200,35 T250,28 T300,30"
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />
          </svg>
          <span className="absolute bottom-1.5 right-2 text-[9px] text-[#00f0ff]/70 font-mono tracking-widest">
            PHOSPHOR CRT // 130 BPM
          </span>
        </div>

        {/* 4-Channel VU Meters */}
        <div className="grid grid-cols-4 gap-2 text-[10px]">
          <VuMeter label="CH1: PULSE" level={8} max={10} color="emerald" />
          <VuMeter label="CH2: ARP" level={6} max={10} color="emerald" />
          <VuMeter label="CH3: WAVE" level={9} max={10} color="amber" />
          <VuMeter label="CH4: NOISE" level={4} max={10} color="cyan" />
        </div>

        {/* Health Telemetry Gauges */}
        <div className="mt-3 pt-2.5 border-t border-[#1e2621] flex flex-wrap items-center justify-between text-[11px] text-[#9bb289]">
          <span>Uptime: <strong className="text-white">99.98%</strong></span>
          <span>p95 Latency: <strong className="text-[#00f0ff]">42ms</strong></span>
          <span>Cron: <strong className="text-[#f7c14c]">Active (12h)</strong></span>
        </div>
      </div>
    </div>
  );
}

/** Step 06: Scale — Post draft and image ready for tweet */
function ScaleView() {
  return (
    <div className="space-y-3 text-[.85rem]">
      {/* Thought pill matching the desktop application screenshot */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ded5c5] bg-[#f5efe2] px-2.5 py-0.5 text-[11px] font-mono text-ink-soft shadow-xs">
        <span className="size-1.5 rounded-full bg-honey" />
        <span>Thought for 8s</span>
        <ChevronRightIcon />
      </div>

      <div className="flex items-center gap-2 text-ink text-[.88rem] font-medium">
        <span>✨</span>
        <span>Here is the post draft and image ready for your tweet:</span>
      </div>

      {/* Draft Tweet Preview with Image and Copy */}
      <div className="rounded-card border border-line-soft bg-paper/90 p-3.5 space-y-2.5 text-[.8rem] shadow-xs">
        <div className="flex items-center justify-between border-b border-line-soft/80 pb-2">
          <p className="font-semibold text-ink flex items-center gap-1.5 text-[.82rem]">
            <span>📝</span> Tweet Copy Draft
          </p>
          <span className="rounded bg-honey/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-honey-deep border border-honey-line/40">
            Ready to Post
          </span>
        </div>

        <p className="text-ink-soft italic leading-relaxed text-[.78rem] bg-card/80 p-2.5 rounded border border-line-soft/80">
          &ldquo;Built a retro 8-bit chiptune album showcase from scratch: NEON BITCRUSH 🕹️⚡ Featuring a live 4-channel Web Audio synth engine, procedural tracks, and CRT visualizer. Try the player live: https://neon-bitcrush.jai.allr.work&rdquo;
        </p>

        {/* Attached Screenshot Image Preview */}
        <div className="overflow-hidden rounded-md border border-[#2d3832] bg-black shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/tweet-neon-bitcrush.jpg"
            alt="NEON BITCRUSH 8-Bit Chiptune Platform Preview"
            className="block w-full h-auto object-cover max-h-[160px]"
          />
        </div>

        <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-ink-soft">
          <span className="flex items-center gap-1 text-green-deep font-semibold">
            <span className="size-1.5 rounded-full bg-green" /> 1 image attached · 276 chars
          </span>
          <span className="text-honey-deep font-medium">Scroll to publish ↗</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Interactive Overlays & Badges
   ========================================================================= */

/** WhatsApp Floating Notification Toast in the Bottom-Left Corner (Operate Step) */
function WhatsAppToast({ visible }: { visible: boolean }) {
  return (
    <aside
      aria-label="WhatsApp notification"
      className={cx(
        "absolute bottom-16 left-3 sm:left-4 z-30 max-w-[280px] sm:max-w-[320px] rounded-card border border-[#d2e8d7] bg-[#ffffff] p-3 shadow-lift transition-all duration-500 ease-out",
        visible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* WhatsApp Official Logo with Notification Badge */}
        <div className="relative shrink-0">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xs">
            <WhatsAppLogo size={20} />
          </div>
          {/* Notification Counter 1 */}
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#ef4444] text-[9px] font-bold text-white shadow-xs">
            1
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="font-sans text-[.82rem] font-bold text-[#1f2c34] flex items-center gap-1">
              <span>Allr Ops Bot</span>
              <span className="text-[10px] text-[#25D366] font-normal">● verified</span>
            </p>
            <span className="text-[10px] text-ink-soft">Just now</span>
          </div>
          <p className="mt-0.5 text-[.78rem] leading-snug text-[#3b4a54]">
            📊 <strong>NEON BITCRUSH</strong> 12h Telemetry Digest: 1,420 unique plays, audio buffer healthy (99.98%).
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-[#e8f8ed] px-2 py-0.5 text-[10px] font-semibold text-[#128c7e]">
              <span>✓✓</span> Delivered via WhatsApp
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Dummy Browser Window Overlay showing the Tweet on X (Scale Step) */
function ScaleBrowserOverlay({ active }: { active: boolean }) {
  const tweetUrl = "https://x.com/Jaxmatrix2/status/2100885720865161579?s=20";

  return (
    <div
      className={cx(
        "absolute inset-2 sm:inset-3 z-30 flex flex-col rounded-panel border border-[#ded5c5] bg-card/95 backdrop-blur-md shadow-2xl transition-all duration-500 ease-out overflow-hidden",
        active
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 scale-95 pointer-events-none",
      )}
    >
      {/* Dummy Browser Window Chrome */}
      <div className="flex items-center justify-between border-b border-[#e5ddd0] bg-[#f4ece0] px-3 py-1.5 shrink-0">
        {/* Browser Traffic Lights */}
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ef4444]" />
          <span className="size-2.5 rounded-full bg-[#f59e0b]" />
          <span className="size-2.5 rounded-full bg-[#10b981]" />
        </div>

        {/* Browser URL Bar */}
        <div className="flex items-center gap-1.5 rounded-md border border-[#ded5c5] bg-card px-3 py-0.5 text-[11px] font-mono text-ink-soft max-w-[280px] sm:max-w-[420px] w-full truncate">
          <span className="text-[#10b981]">🔒</span>
          <span className="truncate">{tweetUrl}</span>
        </div>

        {/* Dummy Tab Controls */}
        <div className="flex items-center gap-1 text-ink-soft text-xs">
          <span>⟳</span>
        </div>
      </div>

      {/* Browser Body: Authentic X / Twitter Post Card */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 text-left text-ink">
        <div className="max-w-[560px] mx-auto rounded-card border border-line-soft bg-card p-4 shadow-soft">
          {/* Tweet Author Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/tweet-avatar.jpg"
                alt="MJX"
                className="size-10 rounded-full object-cover border border-line-soft shadow-xs"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-ink text-[.92rem]">MJX</span>
                  <span className="text-[#1d9bf0] text-sm" title="Verified">✓</span>
                </div>
                <span className="text-ink-soft text-[.8rem]">@Jaxmatrix2</span>
              </div>
            </div>
            {/* X Logo */}
            <XIcon size={18} />
          </div>

          {/* Tweet Copy */}
          <div className="text-[.88rem] leading-relaxed text-ink space-y-2 mb-3">
            <p>
              Built a retro 8-bit chiptune album showcase from scratch: <strong>NEON BITCRUSH</strong> 🕹️⚡
            </p>
            <p className="text-[.82rem] text-ink-soft">
              Procedural 4-channel sound synthesis (NES 2A03 / Game Boy LR35902 core):<br />
              • 2x Pulse leads with custom duty cycles &amp; pitch vibrato • 4-bit stepped wave bass<br />
              • 15-bit LFSR noise percussion
            </p>
            <p className="text-[.82rem] text-ink-soft">
              Features a live CRT oscilloscope, interactive cartridge swapping bay, channel VU meters, and built-in telemetry.
            </p>
            <p className="font-semibold text-green-deep">
              Try the player live:{" "}
              <a
                href="https://neon-bitcrush.jai.allr.work"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-green"
              >
                neon-bitcrush.jai.allr.work
              </a>
            </p>
          </div>

          {/* Attached Screenshot Image */}
          <div className="overflow-hidden rounded-lg border border-[#2d3832] bg-black shadow-xs mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/tweet-neon-bitcrush.jpg"
              alt="NEON BITCRUSH 8-Bit Chiptune Platform"
              className="block w-full h-auto object-cover max-h-[220px]"
            />
          </div>

          {/* Tweet Footer & Link */}
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-line-soft text-[.78rem] text-ink-soft">
            <div className="flex items-center gap-3">
              <span>9:52 AM · Sep 18, 2026</span>
              <span>·</span>
              <strong className="text-ink">10 Views</strong>
            </div>

            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-chip bg-ink px-3 py-1 font-mono text-[.74rem] font-bold text-white hover:bg-ink-soft transition-colors cursor-pointer"
            >
              <span>View Post on X</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Application Shell Primitives
   ========================================================================= */

/** Window Titlebar matching the desktop application screenshot */
function WorkspaceTitlebar() {
  return (
    <div className="flex items-center justify-between border-b border-[#ded5c5] bg-[#f4ece0] px-3 py-2 text-ink-soft shrink-0">
      {/* Left controls: Sidebar toggles & tabs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 mr-2">
          <WindowTabIcon />
          <SwapIcon />
          <SearchIcon />
        </div>

        {/* Project Tab */}
        <div className="flex items-center gap-1.5 rounded-t-md bg-[#fbf9f4] border-t border-x border-[#ded5c5] px-2.5 py-1 text-[11px] font-mono font-bold text-ink">
          <span className="size-1.5 rounded-full bg-honey" />
          <span className="truncate max-w-[140px] sm:max-w-[200px]">BUILD 8-BIT MUSIC ALBUM PLATF...</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 text-xs">
        <CloudCheckIcon />
        <SplitIcon />
        <VolumeIcon />
        <KeyboardIcon />
        <SettingsIcon />
        <div className="flex items-center gap-1.5 ml-2 border-l border-[#ded5c5] pl-2 text-[10px]">
          <span>—</span>
          <span>□</span>
          <span>✕</span>
        </div>
      </div>
    </div>
  );
}

/** Prompt input bar with pixel-art squirrel companion mascot */
function WorkspacePromptBar({
  isInitial,
  stepIndex,
  showPostOverlay,
}: {
  isInitial: boolean;
  stepIndex: number;
  showPostOverlay?: boolean;
}) {
  return (
    <div className="relative mt-auto pt-2.5 shrink-0">
      {/* Squirrel Companion Mascot perched on the prompt bar */}
      <div className="absolute -top-11 left-6 z-20 transition-all duration-300">
        <SquirrelCompanion
          stepIndex={stepIndex}
          state={stepIndex === 5 ? (showPostOverlay ? "waving" : "thinking") : undefined}
          size={44}
          interactive={true}
        />
      </div>

      {/* Prompt Bar Card */}
      <div className="rounded-xl border border-[#ded5c5] bg-[#f5efe2] p-2 sm:p-2.5 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-soft font-mono px-2 truncate">
            {isInitial ? (
              <span className="text-ink font-medium">
                Let&apos;s start building a platform...<span className="animate-pulse">|</span>
              </span>
            ) : (
              "Keep it going..."
            )}
          </span>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block rounded-chip bg-[#e8e0d0] px-2 py-0.5 font-mono text-[10px] text-ink-soft">
              Gemini 3.8 flash · M...
            </span>
            <MicIcon />
            <AudioMuteIcon />
            <button
              type="button"
              className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-ink text-white text-xs hover:bg-ink-soft transition-colors cursor-pointer"
              aria-label="Submit message"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bottom Status Bar */
function WorkspaceStatusBar() {
  return (
    <div className="flex items-center justify-between border-t border-[#ded5c5] bg-[#f4ece0] px-3 py-1.5 text-[11px] font-mono text-ink-soft shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold text-ink">⌘</span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-green" /> Gateway ready
        </span>
        <span className="hidden sm:inline-block text-[#7b8e84]">📁 data</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-honey-deep font-semibold">⚡ Smart</span>
        <span>☀️</span>
        <span className="hidden sm:inline-block"># client v0.0.9</span>
        <span># backend v0.20.1</span>
      </div>
    </div>
  );
}

/** VU Meter Bar component for the telemetric monitor */
function VuMeter({
  label,
  level,
  max,
  color,
}: {
  label: string;
  level: number;
  max: number;
  color: "emerald" | "amber" | "cyan";
}) {
  const [activeLevel, setActiveLevel] = useState(level);

  // Subtle real-time pulse simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 3) - 1;
      setActiveLevel(Math.min(max, Math.max(2, level + delta)));
    }, 800);
    return () => clearInterval(interval);
  }, [level, max]);

  return (
    <div className="rounded bg-[#080d0e] border border-[#16292b] p-1.5 flex flex-col items-center gap-1">
      <span className="text-[8px] text-[#6d887a] font-mono truncate w-full text-center">{label}</span>
      <div className="flex flex-col-reverse gap-0.5 h-12 w-3">
        {Array.from({ length: max }).map((_, i) => {
          const isFilled = i < activeLevel;
          const isHigh = i >= max - 2;
          let bgClass = "bg-[#111e1c]";
          if (isFilled) {
            if (isHigh) bgClass = "bg-[#ef4444]";
            else if (color === "amber") bgClass = "bg-[#f59e0b]";
            else if (color === "cyan") bgClass = "bg-[#00f0ff]";
            else bgClass = "bg-[#10b981]";
          }
          return <span key={i} className={cx("h-1 w-full rounded-[1px] transition-colors duration-150", bgClass)} />;
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   Lightweight SVGs
   ========================================================================= */

function ChevronRightIcon() {
  return (
    <svg className="size-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function WhatsAppLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.275-.1-.476-.15-.677.15-.201.3-.777.979-.953 1.18-.175.2-.351.226-.652.075-.3-.15-1.268-.468-2.416-1.493-.893-.798-1.496-1.783-1.672-2.084-.175-.3-.019-.462.132-.612.136-.135.301-.351.452-.527.15-.175.201-.3.301-.501.1-.2.05-.376-.025-.526-.075-.15-.677-1.633-.928-2.236-.245-.588-.493-.508-.677-.518-.176-.009-.376-.011-.577-.011s-.527.075-.803.376c-.276.3-1.054 1.03-1.054 2.512s1.079 2.914 1.23 3.115c.15.2 2.124 3.243 5.145 4.549.719.311 1.28.497 1.718.636.722.23 1.378.197 1.897.12.578-.087 1.78-.727 2.031-1.43.251-.703.251-1.305.176-1.43-.076-.126-.276-.201-.577-.351zM12.04 2C6.54 2 2.08 6.46 2.08 11.96c0 1.93.55 3.73 1.5 5.26L2 22l4.92-1.54c1.47.88 3.18 1.38 5.12 1.38 5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2z" />
    </svg>
  );
}

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WindowTabIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloudCheckIcon() {
  return (
    <svg className="size-3.5 text-green-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M12 3v18" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" />
      <path d="M8 12h.01" /><path d="M12 12h.01" /><path d="M16 12h.01" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="size-3.5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function AudioMuteIcon() {
  return (
    <svg className="size-3.5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
