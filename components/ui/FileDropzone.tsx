/**
 * FileDropzone Component
 *
 * Drag and drop file upload zone with click to browse support
 */

'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  maxSizeLabel?: string;
}

export function FileDropzone({
  onFilesSelected,
  accept = '.pdf,.doc,.docx',
  multiple = false,
  disabled = false,
  title = 'Drop your file here or click to browse',
  subtitle = 'Supported formats PDF, Docx, Doc',
  maxSizeLabel = 'Max size 10MB',
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const firstFile = droppedFiles[0];
    if (firstFile) {
      onFilesSelected(multiple ? droppedFiles : [firstFile]);
    }
  }, [disabled, multiple, onFilesSelected]);

  const handleClick = useCallback(() => {
    if (disabled) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
    };
    input.click();
  }, [accept, disabled, multiple, onFilesSelected]);

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
        ${isDragging
          ? 'border-violet-500 bg-violet-50'
          : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
          <Upload className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          <p className="text-xs text-gray-400 mt-0.5">{maxSizeLabel}</p>
        </div>
      </div>
    </div>
  );
}
