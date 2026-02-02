/**
 * EllipseGlow Component
 *
 * Decorative background glow effect using ellipse.svg
 * Positioned at the top of the page content area
 */

export function EllipseGlow() {
  return (
    <div
      className="fixed top-0 left-0 right-0 pointer-events-none z-50 h-[700px] w-full overflow-visible"
    >
      <img
        src="/ellipse.svg"
        alt=""
        aria-hidden="true"
        className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[140%] min-w-[1600px] max-w-[2800px] h-auto"
      />
    </div>
  );
}
