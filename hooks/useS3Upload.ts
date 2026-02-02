'use client';

import { useState, useCallback } from 'react';
import { useGetDocumentUploadUrlMutation, useCreateDocumentTemplateMutation, useUpdateDocumentTemplateMutation } from '@/store/services/api';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  documentId: string;
  s3Key: string;
  fileName: string;
  error?: string;
}

interface UseS3UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

interface S3UploadHook {
  uploadDocument: (file: File, type: 'KNOWLEDGE_BASE' | 'SOW_TEMPLATE', name?: string, description?: string) => Promise<UploadResult>;
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

/**
 * Upload file to S3 using presigned URL with progress tracking
 */
async function uploadToS3(
  file: File,
  presignedUrl: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Start upload
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

/**
 * Custom hook for uploading documents to S3 using presigned URLs
 * Supports both Knowledge Base and Deal Template document types
 *
 * @param options - Upload options including callbacks
 * @returns Upload functions and state
 *
 * @example
 * ```tsx
 * const { uploadDocument, uploading, progress, error } = useS3Upload({
 *   onSuccess: (result) => console.log('Uploaded:', result.s3Key),
 *   onError: (error) => console.error('Error:', error),
 * });
 *
 * // Upload a Knowledge Base document
 * await uploadDocument(file, 'KNOWLEDGE_BASE', 'Document Name', 'Description');
 *
 * // Upload a SOW Template document
 * await uploadDocument(file, 'SOW_TEMPLATE', 'Template Name', 'Description');
 * ```
 */
export function useS3Upload(options: UseS3UploadOptions = {}): S3UploadHook {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [getUploadUrl] = useGetDocumentUploadUrlMutation();
  const [createDocument] = useCreateDocumentTemplateMutation();
  const [updateDocument] = useUpdateDocumentTemplateMutation();

  const uploadDocument = useCallback(
    async (
      file: File,
      type: 'KNOWLEDGE_BASE' | 'SOW_TEMPLATE',
      name?: string,
      description?: string
    ): Promise<UploadResult> => {
      setUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      try {
        // Step 1: Create the document record in DynamoDB first
        const documentName = name || file.name.replace(/\.[^/.]+$/, ''); // Remove extension if no name provided
        const createResult = await createDocument({
          name: documentName,
          description: description || '',
          type,
          filename: file.name,
          fileSize: file.size,
          contentType: file.type || 'application/octet-stream',
        }).unwrap();

        const documentId = createResult.id;
        if (!documentId) {
          throw new Error('Failed to create document record');
        }

        // Step 2: Get presigned URL for uploading
        const uploadUrlResult = await getUploadUrl({
          id: documentId,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }).unwrap();

        // Step 3: Upload file to S3 with progress tracking
        await uploadToS3(file, uploadUrlResult.uploadUrl, (uploadProgress) => {
          setProgress(uploadProgress);
          options.onProgress?.(uploadProgress);
        });

        // Step 4: Update the document record with the S3 key
        await updateDocument({
          id: documentId,
          template: {
            name: documentName,
            s3Key: uploadUrlResult.s3Key,
          },
        }).unwrap();

        const result: UploadResult = {
          success: true,
          documentId,
          s3Key: uploadUrlResult.s3Key,
          fileName: file.name,
        };

        setProgress(null);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        options.onError?.(errorMessage);

        return {
          success: false,
          documentId: '',
          s3Key: '',
          fileName: file.name,
          error: errorMessage,
        };
      } finally {
        setUploading(false);
      }
    },
    [getUploadUrl, createDocument, updateDocument, options]
  );

  return {
    uploadDocument,
    uploading,
    progress,
    error,
  };
}
