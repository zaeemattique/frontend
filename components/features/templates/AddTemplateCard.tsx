/**
 * Add Template Card Component
 *
 * Dashed border card for adding new templates
 */

'use client';

export interface AddTemplateCardProps {
  onClick?: () => void;
}

export function AddTemplateCard({ onClick }: AddTemplateCardProps) {
  return (
    <div
      className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center transition-all hover:border-gray-400 hover:bg-gray-100 cursor-pointer"
      style={{ width: '200px', height: '310px' }}
      onClick={onClick}
    >
      {/* Plus Icon */}
      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-3">
        <span className="text-2xl text-gray-500">+</span>
      </div>

      {/* Add Template Text */}
      <p className="text-sm font-medium text-gray-600">Add Template</p>
    </div>
  );
}
