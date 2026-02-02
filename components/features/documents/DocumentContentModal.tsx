/**
 * Document Content Modal
 *
 * Display generated document content for preview.
 *
 * TODO: This component is currently unused. Implement when the API endpoint
 * for generated content is ready.
 */

'use client';

import { Modal } from '@/components/ui/Modal';

interface DocumentContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  dealId: string;
  documentType: string;
  documentTitle?: string;
}

export function DocumentContentModal({
  isOpen,
  onClose,
  companyId: _companyId,
  dealId: _dealId,
  documentType: _documentType,
  documentTitle,
}: DocumentContentModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={documentTitle || 'Document Content'}
      description="Generated document preview"
      size="xl"
    >
      <div className="p-4 text-center text-gray-500">
        <p>Document content viewer is not yet implemented.</p>
        <p className="text-sm mt-2">This feature will be available in a future update.</p>
      </div>
    </Modal>
  );
}
