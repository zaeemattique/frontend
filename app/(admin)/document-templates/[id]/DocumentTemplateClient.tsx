/**
 * Document Template Detail/Edit Page (Admin)
 *
 * View and edit a specific document template:
 * - Template name and description
 * - Template variables
 * - Prompt configuration
 * - Document structure
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useGetDocumentTemplateQuery,
  useUpdateDocumentTemplateMutation,
  useCreateDocumentTemplateMutation,
} from '@/store/services/api';
import { cn } from '@/lib/utils';

// Local variable type for form editing (allows partial values)
interface FormVariable {
  name?: string;
  type?: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'bulleted_list' | 'heading_paragraphs' | 'object';
  description?: string;
  schema?: Record<string, string>;
  required?: boolean;
}

// Extended form data type for this page's form fields
interface TemplateFormData {
  name?: string;
  description?: string;
  version?: string;
  variables?: FormVariable[];
  prompt?: string;
  document_structure?: Record<string, unknown>;
}

export default function DocumentTemplateClient() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const isNew = templateId === 'new';

  // Form state
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    version: '1.0',
    variables: [],
    prompt: '',
    document_structure: {},
  });

  // Fetch existing template if not new
  const {
    data: template,
    isLoading,
    error,
  } = useGetDocumentTemplateQuery(templateId, { skip: isNew });

  // Mutations
  const [updateTemplate, { isLoading: isUpdating }] =
    useUpdateDocumentTemplateMutation();
  const [createTemplate, { isLoading: isCreating }] =
    useCreateDocumentTemplateMutation();

  // Load template data into form
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        version: '1.0',
        variables: template.templateVariables || [],
        prompt: template.defaultPrompt || '',
        document_structure: {},
      });
    }
  }, [template]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle variable changes
  const handleVariableChange = (
    index: number,
    field: keyof FormVariable,
    value: string
  ) => {
    const newVariables = [...(formData.variables || [])];
    newVariables[index] = { ...newVariables[index], [field]: value };
    setFormData((prev) => ({ ...prev, variables: newVariables }));
  };

  // Add new variable
  const handleAddVariable = () => {
    const newVariable: FormVariable = {
      name: '',
      description: '',
      type: 'string',
    };
    setFormData((prev) => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable],
    }));
  };

  // Remove variable
  const handleRemoveVariable = (index: number) => {
    const newVariables = formData.variables?.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, variables: newVariables }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('Template name is required');
      return;
    }

    try {
      if (isNew) {
        const result = await createTemplate(formData).unwrap();
        alert('Template created successfully');
        router.push(`/document-templates/${result.id}`);
      } else {
        await updateTemplate({
          id: templateId,
          template: formData,
        }).unwrap();
        alert('Template updated successfully');
      }
    } catch (_error) {
      alert(isNew ? 'Failed to create template' : 'Failed to update template');
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!isNew && error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load template</p>
        <button
          onClick={() => router.push('/document-templates')}
          className="mt-4 btn btn-primary"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  const isSaving = isUpdating || isCreating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/document-templates"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Templates
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {isNew ? 'Create Template' : formData.name || 'Template'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Standard SOW Template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1.0"
              />
            </div>
          </div>
        </div>

        {/* Variables */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Variables</h2>
            <button
              type="button"
              onClick={handleAddVariable}
              className="btn btn-secondary"
            >
              + Add Variable
            </button>
          </div>

          {formData.variables && formData.variables.length > 0 ? (
            <div className="space-y-4">
              {formData.variables.map((variable, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-md bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Variable {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Variable Name
                      </label>
                      <input
                        type="text"
                        value={variable.name}
                        onChange={(e) =>
                          handleVariableChange(index, 'name', e.target.value)
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., company_name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={variable.type}
                        onChange={(e) =>
                          handleVariableChange(index, 'type', e.target.value)
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="currency">Currency</option>
                        <option value="date">Date</option>
                        <option value="boolean">Boolean</option>
                        <option value="bulleted_list">Bulleted List</option>
                        <option value="heading_paragraphs">Heading + Paragraphs</option>
                        <option value="object">Object</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={variable.description}
                        onChange={(e) =>
                          handleVariableChange(
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Description of this variable"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={variable.required}
                        onChange={(e) =>
                          handleVariableChange(
                            index,
                            'required',
                            e.target.checked.toString()
                          )
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-xs text-gray-700">
                        Required
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No variables defined</p>
              <p className="text-sm mt-1">
                Variables allow dynamic content in generated documents
              </p>
            </div>
          )}
        </div>

        {/* Prompt Configuration */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Prompt Configuration
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Generation Prompt
            </label>
            <textarea
              name="prompt"
              value={formData.prompt}
              onChange={handleChange}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Enter the prompt that will be used to generate documents with this template..."
            />
            <p className="mt-2 text-sm text-gray-500">
              This prompt will be used with AWS Bedrock to generate document
              content. You can reference variables using {'{variable_name}'}.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/document-templates"
            className="btn btn-secondary"
            onClick={(e) => {
              if (
                JSON.stringify(formData) !== JSON.stringify(template || {})
              ) {
                if (
                  !confirm('You have unsaved changes. Are you sure you want to leave?')
                ) {
                  e.preventDefault();
                }
              }
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className={cn('btn btn-primary', isSaving && 'opacity-50')}
          >
            {isSaving ? (
              <>
                <div className="spinner mr-2" />
                Saving...
              </>
            ) : isNew ? (
              'Create Template'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
