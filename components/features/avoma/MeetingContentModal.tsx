/**
 * Meeting Content Modal
 *
 * Display Avoma meeting details:
 * - Meeting transcript
 * - Meeting notes
 * - Meeting metadata
 *
 * TODO: This component is currently unused. Implement when the API endpoint
 * for meeting content is ready.
 */

'use client';

import { Modal } from '@/components/ui/Modal';

interface MeetingContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  dealId: string;
  meetingId: string;
  meetingTitle?: string;
}

export function MeetingContentModal({
  isOpen,
  onClose,
  companyId: _companyId,
  dealId: _dealId,
  meetingId: _meetingId,
  meetingTitle,
}: MeetingContentModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={meetingTitle || 'Meeting Details'}
      description="Avoma meeting content"
      size="xl"
    >
      <div className="p-4 text-center text-gray-500">
        <p>Meeting content viewer is not yet implemented.</p>
        <p className="text-sm mt-2">This feature will be available in a future update.</p>
      </div>
    </Modal>
  );
}
