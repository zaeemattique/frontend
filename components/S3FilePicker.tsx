'use client';

import React, { useRef, useState } from 'react';
import { useS3Upload, UploadResult } from '@/hooks/useS3Upload';

interface S3FilePickerProps {
  /**
   * Upload path for the API endpoint
   * Examples:
   * - `/files/${companyId}/${dealId}` - Upload to deal files
   * - `/files/templates/upload` - Upload template file
   */
  uploadPath: string;

  /**
   * Callback when upload completes successfully
   */
  onUploadComplete?: (results: UploadResult[]) => void;

  /**
   * Callback when upload fails
   */
  onUploadError?: (error: string) => void;

  /**
   * Allow multiple file selection
   * @default true
   */
  multiple?: boolean;

  /**
   * Accepted file types (e.g., ".pdf,.docx,.xlsx")
   * @default "*"
   */
  accept?: string;

  /**
   * Button text
   * @default "Choose Files"
   */
  buttonText?: string;

  /**
   * Custom button className
   */
  buttonClassName?: string;

  /**
   * Show upload progress
   * @default true
   */
  showProgress?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;
}

/**
 * Reusable S3 file picker component with upload progress
 *
 * @example
 * ```tsx
 * // Upload deal files
 * <S3FilePicker
 *   uploadPath={`/files/${companyId}/${dealId}`}
 *   onUploadComplete={(results) => console.log('Uploaded:', results)}
 *   accept=".pdf,.docx"
 *   multiple={true}
 * />
 *
 * // Upload template
 * <S3FilePicker
 *   uploadPath="/files/templates/upload"
 *   onUploadComplete={(results) => setTemplateFile(results[0])}
 *   accept=".docx"
 *   multiple={false}
 *   buttonText="Upload Template"
 * />
 * ```
 */
export default function S3FilePicker({
  uploadPath,
  onUploadComplete,
  onUploadError,
  multiple = true,
  accept = '*',
  buttonText = 'Choose Files',
  buttonClassName,
  showProgress = true,
  disabled = false,
}: S3FilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [_selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { uploadDocument, uploading, progress, error } = useS3Upload({
    onError: onUploadError,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);

    try {
      // Upload files sequentially and collect results
      const results: UploadResult[] = [];

      for (const file of fileArray) {
        // Determine document type from uploadPath
        const docType: 'KNOWLEDGE_BASE' | 'SOW_TEMPLATE' =
          uploadPath.includes('template') ? 'SOW_TEMPLATE' : 'KNOWLEDGE_BASE';

        const result = await uploadDocument(file, docType);
        results.push(result);
      }

      // Filter successful uploads
      const successfulUploads = results.filter((r) => r.success);

      if (successfulUploads.length > 0 && onUploadComplete) {
        onUploadComplete(successfulUploads);
      }

      // Show error for failed uploads
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        const errorMsg = `${failures.length} file(s) failed to upload`;
        if (onUploadError) {
          onUploadError(errorMsg);
        } else {
          alert(errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      if (onUploadError) {
        onUploadError(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setSelectedFiles([]);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const defaultButtonClass = `
    inline-flex items-center justify-center px-4 py-2
    border border-gray-300 rounded-md shadow-sm
    text-sm font-medium text-gray-700 bg-white
    hover:bg-gray-50 focus:outline-none focus:ring-2
    focus:ring-offset-2 focus:ring-blue-500
    cursor-pointer transition-colors
    ${(uploading || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  return (
    <div className="s3-file-picker">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        disabled={uploading || disabled}
        className="hidden"
        id="s3-file-input"
      />

      <label
        htmlFor="s3-file-input"
        className={buttonClassName || defaultButtonClass}
      >
        {uploading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {buttonText}
          </>
        )}
      </label>

      {showProgress && uploading && progress && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 truncate flex-1 mr-4">Uploading...</span>
              <span className="text-gray-900 font-medium">
                {progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {(progress.loaded / 1024 / 1024).toFixed(2)} MB
              </span>
              <span>
                of {(progress.total / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
        </div>
      )}

      {error && !uploading && (
        <div className="mt-2 text-sm text-red-600 flex items-center">
          <svg
            className="h-4 w-4 mr-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
