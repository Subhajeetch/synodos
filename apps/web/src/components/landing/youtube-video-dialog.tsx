import { useState, type CSSProperties } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Play, X } from "lucide-react";

type YouTubeVideoDialogProps = {
  videoId: string;
  buttonLabel: string;
  /** Accessible name only. Nothing is rendered visually. */
  title?: string;
};

/* ---------------------------------------------------------------------------
 * Frosted-glass backdrop
 *
 * Glass is built from layers, not just a blur:
 *   1. backdrop-filter  -> blur + saturation boost (set via classes below)
 *   2. a milky white tint (bg-white/30 in the classes below)
 *   3. a soft light bloom from the top, like light catching the glass
 *   4. a faint vignette so the centre feels lit and the edges have depth
 *   5. very fine grain, which is what makes frosted glass look frosted
 *
 * Don't want the grain? Remove GRAIN from the list at the bottom.
 * ------------------------------------------------------------------------ */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.14'/></svg>",
)}")`;

const BLOOM =
  "radial-gradient(90% 60% at 50% -10%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)";

const VIGNETTE =
  "radial-gradient(120% 100% at 50% 50%, rgba(255,255,255,0) 40%, rgba(10,10,11,0.14) 100%)";

const glassStyle: CSSProperties = {
  backgroundImage: [BLOOM, VIGNETTE, GRAIN].join(", "),
  backgroundSize: "100% 100%, 100% 100%, 160px 160px",
  backgroundRepeat: "no-repeat, no-repeat, repeat",
};

export function YouTubeVideoDialog({
  videoId,
  buttonLabel,
  title = "Synodos product video",
}: YouTubeVideoDialogProps) {
  const id = encodeURIComponent(videoId);
  const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const embedSrc = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        render={
          <button
            type="button"
            className="relative inline-flex h-11 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[color:var(--lp-border)] bg-white px-5 text-sm font-medium text-[color:var(--lp-fg)] shadow-[0_1px_2px_rgba(10,10,11,0.04)] transition-colors hover:-translate-y-px hover:bg-[#F3F3F5] motion-safe:transition-[color,background-color,translate] motion-safe:duration-150"
          />
        }
      >
        <Play aria-hidden="true" className="size-3.5 fill-current" />
        {buttonLabel}
      </DialogPrimitive.Trigger>

      {/* Base UI only mounts the popup while open, so the iframe below
          (and the thumbnail requests) don't exist until the user clicks. */}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          style={glassStyle}
          className="fixed inset-0 z-50 bg-white/30 backdrop-blur-[28px] backdrop-saturate-[1.8] transition-opacity duration-300 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"
        />

        {/* Full-screen, click-through layer: clicks on the empty area fall
            through to the backdrop and dismiss the dialog. */}
        <DialogPrimitive.Popup
          aria-label={title}
          className="group/popup pointer-events-none fixed inset-0 z-50 flex items-center justify-center outline-none transition-opacity duration-300 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"
        >
          <div
            className="pointer-events-auto relative isolate transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[starting-style]/popup:translate-y-3 group-data-[starting-style]/popup:scale-[0.96] group-data-[ending-style]/popup:scale-[0.98] motion-reduce:transition-none"
            // Fits the viewport width AND height. The 10rem reserves room for
            // the close button (44px + 20px gap) above/below the frame.
            style={{
              width: "min(92vw, 1100px, calc((100dvh - 10rem) * 16 / 9))",
            }}
          >
            {/* Close comes first in the DOM so it receives initial focus.
                It's positioned 20px outside the frame: bottom-center on
                mobile, top-right on sm+. Once focus is inside the YouTube
                iframe, Esc can't reach us. */}
            <DialogPrimitive.Close
              aria-label="Close video"
              className="absolute top-full left-1/2 z-10 mt-5 inline-flex size-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-[0_8px_24px_-6px_rgba(10,10,11,0.3)] ring-1 ring-black/5 backdrop-blur-md transition-[background-color,scale] duration-200 hover:bg-white focus-visible:ring-2 focus-visible:ring-neutral-900 active:scale-95 motion-reduce:transition-none sm:top-auto sm:right-0 sm:bottom-full sm:left-auto sm:mt-0 sm:mb-5 sm:translate-x-0"
            >
              <X
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={2.25}
              />
            </DialogPrimitive.Close>

            <AmbientGlow src={thumbnail} />

            {/* White bezel: concentric radii (outer = inner + padding). */}
            <div className="rounded-[20px] bg-white p-1.5 shadow-[0_0_0_1px_rgba(10,10,11,0.06),0_2px_4px_rgba(10,10,11,0.04),0_24px_48px_-12px_rgba(10,10,11,0.25),0_48px_100px_-24px_rgba(10,10,11,0.3)] sm:rounded-3xl sm:p-2">
              <VideoStage
                embedSrc={embedSrc}
                poster={thumbnail}
                title={title}
              />
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Soft colour bleed from the video's thumbnail behind the frame. */
function AmbientGlow({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-6 -z-10 sm:-inset-10"
    >
      <img
        src={src}
        alt=""
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`size-full rounded-[48px] object-cover blur-3xl saturate-200 transition-opacity duration-1000 motion-reduce:transition-none ${
          loaded ? "opacity-60" : "opacity-0"
        }`}
      />
    </div>
  );
}

/** Blurred poster + spinner while YouTube boots, then the player fades in. */
function VideoStage({
  embedSrc,
  poster,
  title,
}: {
  embedSrc: string;
  poster: string;
  title: string;
}) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative isolate aspect-video overflow-hidden rounded-[14px] bg-black shadow-[0_0_0_1px_rgba(10,10,11,0.08)] sm:rounded-2xl">
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 size-full scale-105 object-cover opacity-60 blur-sm"
      />
      <div className="absolute inset-0 grid place-items-center">
        <span className="size-7 rounded-full border-2 border-white/20 border-t-white/80 motion-safe:animate-spin" />
      </div>
      <iframe
        className={`absolute inset-0 block size-full border-0 transition-opacity duration-500 motion-reduce:transition-none ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        src={embedSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        onLoad={() => setReady(true)}
      />
    </div>
  );
}
