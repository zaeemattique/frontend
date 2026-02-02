/**
 * FileUploadModal Component
 *
 * Modal with drag & drop file upload, progress bar, and file info display
 */

'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { Button } from './Button';
import type { UploadProgress } from '@/hooks/useS3Upload';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  title: string;
  accept?: string;
  multiple?: boolean;
  supportedFormatsLabel?: string;
  maxSizeLabel?: string;
  uploading?: boolean;
  progress?: UploadProgress | null;
}

export function FileUploadModal({
  isOpen,
  onClose,
  onUpload,
  title,
  accept = '.pdf,.doc,.docx',
  multiple = false,
  supportedFormatsLabel = 'Supported formats PDF, Docx, Doc',
  maxSizeLabel = 'Max size 10MB',
  uploading = false,
  progress = null,
}: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const firstFile = files[0];
    if (firstFile) {
      setSelectedFile(firstFile);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      setSelectedFile(null);
      onClose();
    }
  }, [selectedFile, onUpload, onClose]);

  const handleClose = useCallback(() => {
    if (!uploading) {
      setSelectedFile(null);
      onClose();
    }
  }, [uploading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with overlay effect */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Dropzone */}
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={accept}
            multiple={multiple}
            disabled={uploading}
            title="Drop your file here or click to browse"
            subtitle={supportedFormatsLabel}
            maxSizeLabel={maxSizeLabel}
          />

          {/* Selected file info with progress */}
          {selectedFile && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                <span>
                  {uploading && progress
                    ? `${progress.percentage}%`
                    : formatFileSize(selectedFile.size)
                  }
                </span>
              </div>

              {/* Progress bar */}
              {uploading && progress && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
