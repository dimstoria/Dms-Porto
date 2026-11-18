/**
 * Fixed Warm Cream (#FFFDF5) Maximalism collage backdrop with crisp graph-grid,
 * subtle corner halftone dot bursts, and restrained geometric frame geometry.
 */
export function AmbientLiquidBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#FFFDF5]"
    >
      {/* Architectural editorial graph grid */}
      <div className="absolute inset-0 bg-brutal-grid opacity-80" />

      {/* Top-left bright yellow halftone corner cluster (softened on margins so foreground stays crisp) */}
      <div
        className="hidden sm:block absolute -top-24 -left-20 h-[360px] w-[360px] rounded-full bg-[#FFE600]/22 bg-brutal-halftone border-[3px] border-[#09090B]/10"
      />

      {/* Mid-right soft electric purple geometric corner block */}
      <div
        className="hidden md:block absolute top-[28%] -right-24 h-[340px] w-[340px] rotate-12 rounded-3xl bg-[#7C3AED]/10 bg-brutal-halftone border-[3px] border-[#09090B]/10"
      />

      {/* Lower-left neon pink halftone collage accent */}
      <div
        className="hidden md:block absolute bottom-[8%] -left-20 h-[300px] w-[300px] -rotate-6 rounded-full bg-[#FF4D8D]/14 bg-brutal-halftone border-[3px] border-[#09090B]/10"
      />
    </div>
  );
}
