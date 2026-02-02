/**
 * Templates Page (SOW Templates)
 *
 * Displays SOW template documents with file upload capability
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Download, Loader2, Pencil } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { SearchBox } from '@/components/ui/SearchBox';
import { useGetDocumentTemplatesQuery, useDeleteDocumentTemplateMutation } from '@/store/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import type { DocumentTemplate } from '@/types';

// Helper function to format file size
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper function to format date
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface TemplateCardProps {
  template: DocumentTemplate;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function TemplateCard({ template, onEdit, onDownload, onDelete, isDeleting }: TemplateCardProps) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all hover:shadow-lg cursor-pointer"
      style={{ width: '200px' }}
      onClick={onEdit}
    >
      {/* Template Preview - SOW Image */}
      <div className="aspect-[3/4] bg-white relative overflow-hidden">
        <Image
          src="/sow.png"
          alt="SOW Template"
          fill
          className="object-cover object-top"
          sizes="200px"
        />
      </div>

      {/* Template Info */}
      <div className="p-3 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-900 text-center truncate mb-1">
          {template.name}
        </p>
        <p className="text-xs text-gray-500 text-center truncate mb-1">
          {template.filename || 'No file'}
        </p>
        <p className="text-xs text-gray-400 text-center mb-2">
          {formatFileSize(template.fileSize)} • {formatDate(template.created_at)}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            className="text-gray-400 hover:text-violet-600 p-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {template.downloadUrl && (
            <button
              className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            className="text-gray-400 hover:text-red-600 p-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce the search query
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Fetch SOW template documents with server-side search
  const { data: templates, isLoading, error, refetch } = useGetDocumentTemplatesQuery({
    type: 'SOW_TEMPLATE',
    search: debouncedSearchQuery || undefined,
  });
  const [deleteTemplate] = useDeleteDocumentTemplateMutation();

  useEffect(() => {
    document.title = 'Templates - SOW Generator';
    return () => {
      document.title = 'SOW Generator';
    };
  }, []);

  const handleAddTemplate = () => {
    router.push('/templates/new');
  };

  const handleEdit = (template: DocumentTemplate) => {
    if (template.id) {
      router.push(`/templates/${template.id}/edit`);
    }
  };

  const handleDownload = (template: DocumentTemplate) => {
    if (template.downloadUrl) {
      window.open(template.downloadUrl, '_blank');
    }
  };

  const handleDelete = async (template: DocumentTemplate) => {
    if (!template.id) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${template.name}"?`);
    if (!confirmed) return;

    setDeletingId(template.id);
    try {
      await deleteTemplate(template.id).unwrap();
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  // Templates are now filtered server-side via search parameter
  const filteredTemplates = templates || [];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Title and Subtitle */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Templates</h1>
        <p className="text-sm text-gray-600">
          Upload and manage SOW templates for your SOW generation
        </p>
      </div>

      {/* Search Box */}
      <div className="flex gap-3 mb-6">
        <SearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search Template"
          className="flex-1 max-w-md"
        />
      </div>

      {/* Action Button */}
      <div className="mb-6 flex justify-end">
        <Button
          variant="primary"
          onClick={handleAddTemplate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load templates</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!templates || templates.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-4">Create your first SOW template to get started</p>
            <Button variant="primary" onClick={handleAddTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {!isLoading && !error && templates && templates.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => handleEdit(template)}
                onDownload={() => handleDownload(template)}
                onDelete={() => handleDelete(template)}
                isDeleting={deletingId === template.id}
              />
            ))}
          </div>

          {filteredTemplates.length === 0 && debouncedSearchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-600">No templates found matching your search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
