/**
 * Edit Template Page
 *
 * Full template editing form with:
 * - Template Name & Description
 * - Four prompt fields (Default/SOW, Implementation, Architecture, Pricing)
 * - Template Variables builder
 * - File upload (.docx)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, X, Loader2, Upload, FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Select } from '@/components/ui/Select';
import {
  useGetDocumentTemplateQuery,
  useUpdateDocumentTemplateMutation,
  useGetDocumentUploadUrlMutation,
} from '@/store/services/api';

// Local form variable type (allows partial values during editing)
interface FormVariable {
  name: string;
  type: 'string' | 'bulleted_list' | 'heading_paragraphs' | 'object' | 'currency' | 'date' | 'number';
  description: string;
  schema?: Record<string, string>;
}

interface FormData {
  name: string;
  description: string;
  defaultPrompt: string;
  implementationPrompt: string;
  architecturePrompt: string;
  essentialPricingPrompt: string;
  growthPricingPrompt: string;
  templateVariables: FormVariable[];
}

const VARIABLE_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'bulleted_list', label: 'Bulleted List' },
  { value: 'heading_paragraphs', label: 'Heading Paragraphs' },
  { value: 'object', label: 'Object' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
] as const;

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const { data: template, isLoading: isLoadingTemplate, error: loadError } = useGetDocumentTemplateQuery(templateId);
  const [updateTemplate] = useUpdateDocumentTemplateMutation();
  const [getUploadUrl] = useGetDocumentUploadUrlMutation();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    defaultPrompt: '',
    implementationPrompt: '',
    architecturePrompt: '',
    essentialPricingPrompt: '',
    growthPricingPrompt: '',
    templateVariables: [],
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFilename, setExistingFilename] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Load template data when fetched
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        defaultPrompt: template.defaultPrompt || '',
        implementationPrompt: template.implementationPrompt || '',
        architecturePrompt: template.architecturePrompt || '',
        essentialPricingPrompt: template.essentialPricingPrompt || '',
        growthPricingPrompt: template.growthPricingPrompt || '',
        templateVariables: template.templateVariables || [],
      });
      setExistingFilename(template.filename || null);
    }
  }, [template]);

  useEffect(() => {
    document.title = template ? `Edit ${template.name} - SOW Generator` : 'Edit Template - SOW Generator';
    return () => {
      document.title = 'SOW Generator';
    };
  }, [template]);

  // Template Variables Management
  const addVariable = () => {
    setFormData({
      ...formData,
      templateVariables: [
        ...formData.templateVariables,
        { name: '', type: 'string', description: '' },
      ],
    });
  };

  const updateVariable = (index: number, field: keyof FormVariable, value: string) => {
    const updated = formData.templateVariables.map((v, i) => {
      if (i !== index) return v;
      return { ...v, [field]: value } as FormVariable;
    });
    setFormData({ ...formData, templateVariables: updated });
  };

  const removeVariable = (index: number) => {
    const updated = formData.templateVariables.filter((_, i) => i !== index);
    setFormData({ ...formData, templateVariables: updated });
  };

  // File handling
  const handleFilesSelected = (files: File[]) => {
    const file = files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  // Upload file to S3 - returns both filename and s3Key
  const uploadFileToS3 = async (file: File, id: string): Promise<{ filename: string; s3Key: string } | null> => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      // Get presigned URL (also returns s3Key for where file will be stored)
      const uploadUrlResult = await getUploadUrl({
        id,
        filename: cleanFilename,
        contentType: file.type || 'application/octet-stream',
      }).unwrap();

      // Upload to S3 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentage);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', uploadUrlResult.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      // Return both filename and s3Key - s3Key is needed by SOW generator to find the file
      return { filename: cleanFilename, s3Key: uploadUrlResult.s3Key };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'File upload failed';
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Form validation
  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Template name is required';
    }
    if (!formData.description.trim()) {
      return 'Description is required';
    }
    if (!formData.defaultPrompt.trim()) {
      return 'Default prompt (SOW Generation) is required';
    }
    if (!formData.implementationPrompt.trim()) {
      return 'Implementation prompt is required';
    }
    if (!formData.architecturePrompt.trim()) {
      return 'Architecture prompt is required';
    }
    // SMC prompts are optional - system defaults will be used if empty
    if (formData.templateVariables.length === 0) {
      return 'At least one template variable is required';
    }

    for (let i = 0; i < formData.templateVariables.length; i++) {
      const variable = formData.templateVariables[i];
      if (!variable) continue;
      if (!variable.name.trim()) {
        return `Variable #${i + 1}: Name is required`;
      }
      if (!variable.description.trim()) {
        return `Variable #${i + 1}: Description is required`;
      }
    }

    return null;
  };

  // Save template
  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Step 1: Update template record
      const templateData: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        defaultPrompt: formData.defaultPrompt.trim(),
        implementationPrompt: formData.implementationPrompt.trim(),
        architecturePrompt: formData.architecturePrompt.trim(),
        essentialPricingPrompt: formData.essentialPricingPrompt.trim(),
        growthPricingPrompt: formData.growthPricingPrompt.trim(),
        templateVariables: formData.templateVariables,
      };

      // Step 2: Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadFileToS3(selectedFile, templateId);
        if (uploadResult) {
          templateData.templateFilename = uploadResult.filename;
          templateData.s3Key = uploadResult.s3Key;
        }
      }

      await updateTemplate({
        id: templateId,
        template: templateData,
      }).unwrap();

      // Navigate back to templates list
      router.push('/templates');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/templates');
  };

  if (isLoadingTemplate) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (loadError || !template) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">Failed to load template</p>
        <Button variant="secondary" onClick={() => router.push('/templates')}>
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Templates
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Template</h1>
        <p className="text-sm text-gray-600 mt-1">
          Update your document template configuration
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-4xl">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Template Name */}
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            placeholder="e.g., Standard SOW Template"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
            placeholder="Describe the purpose and use case for this template"
          />
        </div>

        {/* Default Prompt */}
        <div className="mb-6">
          <label htmlFor="defaultPrompt" className="block text-sm font-medium text-gray-700 mb-1">
            Default Prompt (SOW Generation) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="defaultPrompt"
            value={formData.defaultPrompt}
            onChange={(e) => setFormData({ ...formData, defaultPrompt: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y font-mono text-sm"
            placeholder="Enter the prompt that will be used to generate SOW content for this template"
          />
          <p className="text-xs text-gray-500 mt-1">
            Define the business context and sections. Do not include JSON schema or formatting instructions.
          </p>
        </div>

        {/* Implementation Prompt */}
        <div className="mb-6">
          <label htmlFor="implementationPrompt" className="block text-sm font-medium text-gray-700 mb-1">
            Implementation Plan Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            id="implementationPrompt"
            value={formData.implementationPrompt}
            onChange={(e) => setFormData({ ...formData, implementationPrompt: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y font-mono text-sm"
            placeholder="Enter the prompt for generating implementation plan documents (phases, milestones, delivery approach)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Available placeholders: {'{customer}'}, {'{project}'}, {'{facts_pack}'}
          </p>
        </div>

        {/* Architecture Prompt */}
        <div className="mb-6">
          <label htmlFor="architecturePrompt" className="block text-sm font-medium text-gray-700 mb-1">
            Architecture / Services Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            id="architecturePrompt"
            value={formData.architecturePrompt}
            onChange={(e) => setFormData({ ...formData, architecturePrompt: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y font-mono text-sm"
            placeholder="Enter the prompt for generating AWS services technical specification documents"
          />
          <p className="text-xs text-gray-500 mt-1">
            Available placeholders: {'{customer}'}, {'{project}'}, {'{facts_pack}'}
          </p>
        </div>

        {/* Essential SMC Prompt */}
        <div className="mb-6">
          <label htmlFor="essentialPricingPrompt" className="block text-sm font-medium text-gray-700 mb-1">
            Essential SMC Prompt
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Baseline AWS spend - minimal configuration)
            </span>
          </label>
          <textarea
            id="essentialPricingPrompt"
            value={formData.essentialPricingPrompt}
            onChange={(e) => setFormData({ ...formData, essentialPricingPrompt: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y font-mono text-sm"
            placeholder="Leave empty to use system default. Custom prompt for Essential SMC (baseline cost estimate)..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Essential SMC: single-AZ, no DR, On-Demand pricing only. Placeholders: {'{customer}'}, {'{project}'}, {'{facts_pack}'}, {'{architecture_content}'}, {'{capacity_section}'}
          </p>
        </div>

        {/* Growth SMC Prompt */}
        <div className="mb-6">
          <label htmlFor="growthPricingPrompt" className="block text-sm font-medium text-gray-700 mb-1">
            Growth SMC Prompt
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Scale-ready with HA/DR for AWS funding)
            </span>
          </label>
          <textarea
            id="growthPricingPrompt"
            value={formData.growthPricingPrompt}
            onChange={(e) => setFormData({ ...formData, growthPricingPrompt: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y font-mono text-sm"
            placeholder="Leave empty to use system default. Custom prompt for Growth SMC (scaled cost estimate)..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Growth SMC: Multi-AZ, DR, 10-20% buffer, RI recommendations. Placeholders: {'{customer}'}, {'{project}'}, {'{facts_pack}'}, {'{architecture_content}'}, {'{capacity_section}'}
          </p>
        </div>

        {/* Template Variables Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Template Variables <span className="text-red-500">*</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Define the variables used in your Word template (e.g., {'{{executive_summary}}'}, {'{{in_scope}}'})
          </p>

          {formData.templateVariables.length > 0 && (
            <>
              {/* Column Headers */}
              <div className="flex gap-4 items-end mb-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Variable Name
                  </label>
                </div>
                <div className="w-40">
                  <label className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                </div>
                <div className="w-10" /> {/* Spacer for delete button */}
              </div>

              {/* Variable Rows */}
              <div className="space-y-3">
                {formData.templateVariables.map((variable, index) => (
                  <div key={index} className="flex gap-4 items-center">
                    {/* Variable Name */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={variable.name}
                        onChange={(e) => updateVariable(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="e.g., executive_summary"
                      />
                    </div>

                    {/* Variable Type */}
                    <div className="w-40">
                      <Select
                        options={VARIABLE_TYPES.map(t => ({ value: t.value, label: t.label }))}
                        value={variable.type}
                        onChange={(value) => updateVariable(index, 'type', value)}
                      />
                    </div>

                    {/* Variable Description */}
                    <div className="flex-[2]">
                      <input
                        type="text"
                        value={variable.description}
                        onChange={(e) => updateVariable(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="e.g., project overview paragraph"
                      />
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeVariable(index)}
                      className="w-10 h-10 flex items-center justify-center bg-violet-900 text-white rounded-lg hover:bg-violet-800 transition-colors"
                      title="Remove variable"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {formData.templateVariables.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg">
              No variables defined. Click &quot;Add Variable&quot; to create your first template variable.
            </div>
          )}

          {/* Add Variable Button */}
          <div className="mt-4">
            <Button variant="secondary" onClick={addVariable} className="text-sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Variable
            </Button>
          </div>
        </div>

        {/* Template File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template File (.docx)
          </label>

          {/* Show existing file info */}
          {existingFilename && !selectedFile && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>Current file: <strong>{existingFilename}</strong></span>
              </div>
            </div>
          )}

          {selectedFile ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-violet-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB (new file)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploading && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          ) : (
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              accept=".doc,.docx"
              title="Drop a new template file here or click to browse"
              subtitle="Word documents only (.doc, .docx)"
              maxSizeLabel="Max size 10MB"
            />
          )}
          <p className="text-xs text-gray-500 mt-2">
            Upload a new file to replace the existing template file.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
          <Button variant="secondary" onClick={handleCancel} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || uploading}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
