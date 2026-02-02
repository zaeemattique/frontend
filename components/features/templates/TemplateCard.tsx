/**
 * Template Card Component
 *
 * Displays a template preview with clickable image
 */

'use client';

export interface TemplateCardProps {
  id: string;
  title: string;
  previewImage: string;
  onClick?: () => void;
}

export function TemplateCard({
  title,
  previewImage,
  onClick,
}: TemplateCardProps) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all hover:shadow-lg cursor-pointer"
      style={{ width: '200px' }}
      onClick={onClick}
    >
      {/* Template Preview Image */}
      <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
        <img
          src={previewImage}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Template Title */}
      <div className="p-3 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-900 text-center truncate">
          {title}
        </p>
      </div>
    </div>
  );
}
