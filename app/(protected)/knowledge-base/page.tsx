/**
 * Knowledge Base Page
 *
 * Displays knowledge base documents with file upload capability
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, Loader2, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FileUploadModal } from '@/components/ui/FileUploadModal';
import { PDFViewerModal } from '@/components/ui/PDFViewerModal';
import { useGetDocumentTemplatesQuery, useDeleteDocumentTemplateMutation } from '@/store/services/api';
import { useS3Upload } from '@/hooks/useS3Upload';
import type { DocumentTemplate } from '@/types';

// Helper function to format file size
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

// Helper function to format date like "Oct 20 at 4:30pm"
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return `${month} ${day} at ${hour12}:${minutes}${ampm}`;
}

interface KnowledgeBaseCardProps {
  document: DocumentTemplate;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function KnowledgeBaseCard({ document: doc, onView, onDownload, onDelete, isDeleting }: KnowledgeBaseCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div
      className="bg-neutral-50 rounded-xl p-5 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:bg-white cursor-pointer relative"
      style={{ width: '320px' }}
      onClick={onView}
    >
      {/* Header with date and 3-dot menu */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-base text-neutral-700">
          {formatDate(doc.created_at)}
        </span>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            className="text-neutral-500 hover:text-neutral-700 p-1 rounded-md hover:bg-neutral-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 min-w-[140px]">
              {doc.downloadUrl && (
                <button
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-gray-50 flex items-center gap-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                    setIsMenuOpen(false);
                  }}
                >
                  <Eye className="w-5 h-5" />
                  <span>View</span>
                </button>
              )}
              {doc.downloadUrl && (
                <button
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-gray-50 flex items-center gap-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                    setIsMenuOpen(false);
                  }}
                >
                  <Download className="w-5 h-5" />
                  <span>Download</span>
                </button>
              )}
              <button
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-3"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setIsMenuOpen(false);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title - 16px violet/950 bold */}
      <h3 className="text-base font-bold text-violet-950 mb-4 line-clamp-2">
        {doc.name}
      </h3>

      {/* File info with PDF icon and size */}
      <div className="flex items-center gap-3 mt-4">
        {/* PDF Icon */}
        <div className="flex-shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4C6 2.89543 6.89543 2 8 2H18L26 10V28C26 29.1046 25.1046 30 24 30H8C6.89543 30 6 29.1046 6 28V4Z" fill="#FFFFFF" stroke="#E5E5E5"/>
            <path d="M18 2V10H26" fill="#F5F5F5"/>
            <path d="M18 2L26 10H18V2Z" fill="#F5F5F5" stroke="#E5E5E5"/>
            <rect x="4" y="14" width="16" height="10" rx="2" fill="#DC2626"/>
            <text x="12" y="21.5" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="system-ui">PDF</text>
          </svg>
        </div>
        <span className="text-sm text-neutral-600">
          {formatFileSize(doc.fileSize)}
        </span>
      </div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentTemplate | null>(null);

  // Fetch knowledge base documents
  const { data: documents, isLoading, error, refetch } = useGetDocumentTemplatesQuery({ type: 'KNOWLEDGE_BASE' });
  const [deleteDocument] = useDeleteDocumentTemplateMutation();

  // Upload hook
  const { uploadDocument, uploading, progress } = useS3Upload({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error}`);
    },
  });

  useEffect(() => {
    document.title = 'Knowledge Base - SOW Generator';
    return () => {
      document.title = 'SOW Generator';
    };
  }, []);

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    await uploadDocument(file, 'KNOWLEDGE_BASE');
  };

  const handleView = (doc: DocumentTemplate) => {
    if (doc.downloadUrl) {
      setViewingDocument(doc);
    }
  };

  const handleDownload = (doc: DocumentTemplate) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
    }
  };

  const handleDelete = async (doc: DocumentTemplate) => {
    if (!doc.id) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${doc.name}"?`);
    if (!confirmed) return;

    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id).unwrap();
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        title="Upload Knowledge Base"
        accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx"
        supportedFormatsLabel="Supported formats PDF, Docx, Doc, TXT, MD, XLS, XLSX, PPT, PPTX"
        maxSizeLabel="Max size 10MB"
        uploading={uploading}
        progress={progress}
      />

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        pdfUrl={viewingDocument?.downloadUrl || null}
        title={viewingDocument?.name || 'Document'}
        onDownload={() => viewingDocument && handleDownload(viewingDocument)}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="primary"
          onClick={handleUploadClick}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Files
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
            <p className="text-red-600 mb-4">Failed to load documents</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!documents || documents.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-600 mb-4">Upload your first knowledge base document to get started</p>
            <Button variant="primary" onClick={handleUploadClick}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>
      )}

      {/* Documents grid */}
      {!isLoading && !error && documents && documents.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-4">
            {documents.map((doc) => (
              <KnowledgeBaseCard
                key={doc.id}
                document={doc}
                onView={() => handleView(doc)}
                onDownload={() => handleDownload(doc)}
                onDelete={() => handleDelete(doc)}
                isDeleting={deletingId === doc.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
