/**
 * Fixed Warm Cream (#FFFDF5) Modern Web Maximalism canvas backdrop
 * with bold graph grid, comic halftone dot patches, and dopamine accents.
 */
export function AmbientLiquidBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#FFFDF5]"
    >
      {/* Crisp Graph Grid Layer */}
      <div className="absolute inset-0 bg-brutal-grid opacity-80" />

      {/* Top-right Halftone Patch inside Neon Pink Wash */}
      <div className="hidden md:block absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#FFE600]/45 border-[3px] border-[#09090B]/15" />
      <div className="hidden md:block absolute top-12 right-12 h-48 w-48 bg-brutal-halftone opacity-75" />

      {/* Mid-left Electric Purple Collage Block */}
      <div className="hidden lg:block absolute top-[38%] -left-20 h-44 w-44 rotate-12 rounded-3xl bg-[#7C3AED]/12 border-2 border-[#09090B]/15" />

      {/* Lower-right Acid Lime & Pink Geometric Accents */}
      <div className="hidden md:block absolute bottom-16 -right-14 h-40 w-40 -rotate-12 rounded-2xl bg-[#FF4D8D]/15 border-2 border-[#09090B]/15" />
    </div>
  );
}
