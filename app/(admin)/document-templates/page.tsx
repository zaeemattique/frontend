/**
 * Document Templates List Page (Admin)
 *
 * Manage document templates:
 * - List all templates
 * - Create new templates
 * - Edit existing templates
 * - Delete templates
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useGetDocumentTemplatesQuery,
  useDeleteDocumentTemplateMutation,
} from '@/store/services/api';
import { formatDateTime, cn } from '@/lib/utils';

export default function DocumentTemplatesPage() {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    data: templatesData,
    isLoading,
    error,
  } = useGetDocumentTemplatesQuery();

  const [deleteTemplate, { isLoading: isDeleting }] =
    useDeleteDocumentTemplateMutation();

  const handleDelete = async (templateId: string) => {
    if (deleteConfirm !== templateId) {
      setDeleteConfirm(templateId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await deleteTemplate(templateId).unwrap();
      setDeleteConfirm(null);
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load templates</p>
      </div>
    );
  }

  const templates = templatesData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Document Templates
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage SOW generation templates
          </p>
        </div>
        <Link href="/document-templates/new" className="btn btn-primary">
          + Create Template
        </Link>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No templates found</p>
          <Link
            href="/document-templates/new"
            className="inline-block btn btn-primary"
          >
            Create Your First Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="card hover:shadow-lg transition-shadow"
            >
              {/* Template Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Template Info */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900">
                    {template.type || 'SOW_TEMPLATE'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900">
                    {formatDateTime(template.created_at)}
                  </span>
                </div>
                {template.updated_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium text-gray-900">
                      {formatDateTime(template.updated_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Variables Count */}
              {template.templateVariables && template.templateVariables.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    {template.templateVariables.length} variable
                    {template.templateVariables.length !== 1 ? 's' : ''} defined
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <Link
                  href={`/document-templates/${template.id}`}
                  className="flex-1 btn btn-secondary text-center"
                >
                  View/Edit
                </Link>
                <button
                  onClick={() => handleDelete(template.id || '')}
                  disabled={isDeleting}
                  className={cn(
                    'flex-1 btn text-center',
                    deleteConfirm === template.id
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'btn-secondary text-red-600 hover:bg-red-50'
                  )}
                >
                  {deleteConfirm === template.id
                    ? 'Confirm Delete'
                    : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          About Document Templates
        </h3>
        <p className="text-sm text-blue-700">
          Document templates define the structure and content for generated SOWs.
          Each template can include variables that will be replaced with actual
          deal data during generation. Templates can be assigned to deals on the
          deal detail page.
        </p>
      </div>
    </div>
  );
}
