/**
 * Global Loading Component
 *
 * Shown while pages are loading
 */

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="spinner mb-4" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
