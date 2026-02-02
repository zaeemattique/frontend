'use client';

import React, { useState } from 'react';
import S3FilePicker from './S3FilePicker';
import { UploadResult } from '@/hooks/useS3Upload';
import { useCreateDocumentTemplateMutation } from '@/store/services/api';

interface TemplateUploadProps {
  /**
   * Template type: SOW_TEMPLATE or KNOWLEDGE_BASE
   */
  type: 'SOW_TEMPLATE' | 'KNOWLEDGE_BASE';

  /**
   * Callback when template metadata is saved
   */
  onTemplateSaved?: (templateId: string) => void;
}

/**
 * Complete template upload workflow component
 * 1. User fills in template details
 * 2. User uploads .docx file to S3
 * 3. Creates template record in DynamoDB
 *
 * @example
 * ```tsx
 * // Upload a SOW template
 * <TemplateUpload
 *   type="SOW_TEMPLATE"
 *   onTemplateSaved={(id) => console.log('Saved:', id)}
 * />
 *
 * // Upload a knowledge base document
 * <TemplateUpload
 *   type="KNOWLEDGE_BASE"
 *   onTemplateSaved={(id) => router.push(`/knowledge-base/${id}`)}
 * />
 * ```
 */
export default function TemplateUpload({ type, onTemplateSaved }: TemplateUploadProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultPrompt: '',
    architecturePrompt: '',
    pricingPrompt: '',
  });

  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createDocumentTemplate, { isLoading: saving }] = useCreateDocumentTemplateMutation();

  const handleFileUpload = (results: UploadResult[]) => {
    const firstResult = results[0];
    if (firstResult) {
      setUploadedFile(firstResult);
      setError(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!uploadedFile) {
      setError('Please upload a file first');
      return;
    }

    if (!formData.name || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);

    try {
      const savedTemplate = await createDocumentTemplate({
        name: formData.name,
        description: formData.description,
        type: type,
        templateFilename: uploadedFile.fileName,
        defaultPrompt: formData.defaultPrompt || 'Generate a comprehensive document based on the provided context.',
        architecturePrompt: formData.architecturePrompt || 'Generate solution architecture documentation.',
        pricingPrompt: formData.pricingPrompt || 'Generate pricing calculator.',
      }).unwrap();

      if (onTemplateSaved) {
        onTemplateSaved(savedTemplate.id);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        defaultPrompt: '',
        architecturePrompt: '',
        pricingPrompt: '',
      });
      setUploadedFile(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save template';
      setError(errorMsg);
    }
  };

  const typeLabel = type === 'SOW_TEMPLATE' ? 'SOW Template' : 'Knowledge Base Document';

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Upload {typeLabel}</h2>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={type === 'SOW_TEMPLATE' ? 'Enterprise SOW Template' : 'AWS Best Practices Guide'}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the purpose and contents of this document..."
          />
        </div>

        {type === 'SOW_TEMPLATE' && (
          <>
            {/* Default Prompt */}
            <div>
              <label htmlFor="defaultPrompt" className="block text-sm font-medium text-gray-700 mb-1">
                Default Prompt
              </label>
              <textarea
                id="defaultPrompt"
                value={formData.defaultPrompt}
                onChange={(e) => setFormData({ ...formData, defaultPrompt: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Generate a comprehensive SOW document..."
              />
            </div>

            {/* Architecture Prompt */}
            <div>
              <label htmlFor="architecturePrompt" className="block text-sm font-medium text-gray-700 mb-1">
                Architecture Prompt
              </label>
              <textarea
                id="architecturePrompt"
                value={formData.architecturePrompt}
                onChange={(e) => setFormData({ ...formData, architecturePrompt: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Generate solution architecture documentation..."
              />
            </div>

            {/* Pricing Prompt */}
            <div>
              <label htmlFor="pricingPrompt" className="block text-sm font-medium text-gray-700 mb-1">
                Pricing Prompt
              </label>
              <textarea
                id="pricingPrompt"
                value={formData.pricingPrompt}
                onChange={(e) => setFormData({ ...formData, pricingPrompt: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Generate pricing calculator..."
              />
            </div>
          </>
        )}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload File <span className="text-red-500">*</span>
          </label>
          <S3FilePicker
            uploadPath="/files/templates/upload"
            onUploadComplete={handleFileUpload}
            onUploadError={setError}
            accept=".docx,.pdf"
            multiple={false}
            buttonText={uploadedFile ? 'Replace File' : 'Choose File'}
          />
          {uploadedFile && (
            <div className="mt-2 flex items-center text-sm text-green-600">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {uploadedFile.fileName}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                defaultPrompt: '',
                architecturePrompt: '',
                pricingPrompt: '',
              });
              setUploadedFile(null);
              setError(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving || !uploadedFile}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
