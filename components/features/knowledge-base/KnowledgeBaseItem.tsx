/**
 * Knowledge Base Item Component
 *
 * Card component for displaying knowledge base documents
 * Fixed width: 290px
 */

'use client';

export interface KnowledgeBaseItemProps {
  title: string;
  description: string;
  date: string;
  fileSize: string;
  onClick?: () => void;
}

export function KnowledgeBaseItem({
  title,
  description,
  date,
  fileSize,
  onClick,
}: KnowledgeBaseItemProps) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md cursor-pointer"
      style={{ width: '290px' }}
      onClick={onClick}
    >
      {/* Header with date and menu */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-neutral-600 font-medium">{date}</span>
        <button
          className="text-gray-400 hover:text-gray-600 p-1"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open menu
          }}
        >
          <span className="text-lg">⋮</span>
        </button>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-violet-950 mb-2 line-clamp-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-neutral-800 mb-4 line-clamp-2">
        {description}
      </p>

      {/* File size with PDF icon */}
      <div className="flex items-center gap-2">
        <span className="text-neutral-600 text-lg">📄</span>
        <span className="text-xs text-neutral-600">{fileSize}</span>
      </div>
    </div>
  );
}
