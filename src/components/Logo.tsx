/**
 * The Essence identity.
 *
 * `Logo` is the wordmark: "Es[sen]ce" with the middle struck through by a
 * highlighter. That isn't decoration — marking a span inside a piece of writing
 * is precisely what the app does to a student's draft, and the same gesture
 * appears as `.quote-mark` in the editor. The mark is a miniature of the
 * product's core interaction.
 *
 * `LogoMark` is the square icon: three lines of text that also read as an E,
 * with the middle one highlighted. It survives being shrunk to a favicon, which
 * the wordmark does not.
 */

interface LogoProps {
  /** Rendered size. `sm` is nav-bar scale, `xl` is a landing hero. */
  size?: "sm" | "md" | "lg" | "xl";
  /** The "ADMISSIONS ESSAYS" line under the wordmark. */
  tagline?: boolean;
  className?: string;
}

const SIZES: Record<
  NonNullable<LogoProps["size"]>,
  { text: string; bleed: string; tag: string }
> = {
  // `bleed` is the highlighter's spread past the glyphs; it has to scale with
  // the type or the stroke looks pasted on at large sizes and floods at small.
  sm: { text: "text-xl", bleed: "0 0 0 2px", tag: "text-[0.5rem]" },
  md: { text: "text-3xl", bleed: "0 0 0 3px", tag: "text-[0.55rem]" },
  lg: { text: "text-5xl", bleed: "0 0 0 4px", tag: "text-[0.6rem]" },
  xl: { text: "text-7xl", bleed: "0 0 0 5px", tag: "text-[0.65rem]" },
};

export default function Logo({
  size = "sm",
  tagline = false,
  className = "",
}: LogoProps) {
  const scale = SIZES[size];

  return (
    <span className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      <span
        className={`font-wordmark leading-[0.9] tracking-tight text-ink ${scale.text}`}
      >
        Es
        <span
          className="text-ink"
          style={{
            background: "var(--color-mark)",
            boxShadow: `var(--color-mark) ${scale.bleed}`,
          }}
        >
          sen
        </span>
        ce
      </span>

      {tagline && (
        <span
          className={`pl-[3px] font-mono uppercase tracking-[0.26em] text-muted ${scale.tag}`}
        >
          Admissions essays
        </span>
      )}
    </span>
  );
}

/**
 * The square mark: three lines of text that also read as an E.
 *
 * Drawn as SVG rather than divs so every proportion scales exactly with the
 * box — the stroke weights have to hold at 16px favicon size, where em-relative
 * CSS lengths drift against whatever font-size happens to be inherited.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Essence"
      className={`shrink-0 ${className}`}
    >
      <rect width="64" height="64" rx="14" fill="var(--color-ink, #1c1a17)" />
      <rect x="15" y="21" width="34" height="5" rx="2.5" fill="var(--color-paper, #fbfaf7)" />
      <rect x="15" y="30" width="24" height="5" rx="2.5" fill="var(--color-mark, #c8e45c)" />
      <rect x="15" y="39" width="34" height="5" rx="2.5" fill="var(--color-paper, #fbfaf7)" />
    </svg>
  );
}
