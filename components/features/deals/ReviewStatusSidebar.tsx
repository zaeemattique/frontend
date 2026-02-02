/**
 * Review Status Sidebar Component
 *
 * Shows the review workflow status for a deal
 * Displays Technical Review and Deal Desk Review cards with approval/rework actions
 * Only visible to Leadership role when SOW is submitted for review
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUpdateDealPhaseMutation, useCreateNotificationMutation } from '@/store/services/api';
import { DEAL_STATUS } from '@/utils/dealStatus';

type DealStatus = typeof DEAL_STATUS[keyof typeof DEAL_STATUS] | string;

interface ReviewStatusSidebarProps {
  dealId: string;
  dealName: string;
  dealStatus: DealStatus;
  assigneeId?: string;
  assigneeName?: string;
  onStatusChange?: () => void;
}

interface ReviewCardProps {
  title: string;
  status: 'pending' | 'approved' | 'flagged' | 'disabled';
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  onApprove: () => void;
  onFlagForRework: () => void;
}

function ReviewCard({
  title,
  status,
  isActive,
  isLoading,
  error,
  onApprove,
  onFlagForRework,
}: ReviewCardProps) {
  const isDisabled = status === 'disabled';
  const isApproved = status === 'approved';
  const isFlagged = status === 'flagged';
  const isPending = status === 'pending';

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isDisabled
          ? 'border-gray-200 bg-gray-50 opacity-50'
          : isApproved
          ? 'border-green-200 bg-green-50'
          : isFlagged
          ? 'border-orange-200 bg-orange-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Status Badge */}
      <div className="mb-3">
        {isPending && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Pending Review
          </span>
        )}
        {isApproved && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <Check className="w-3.5 h-3.5" />
            Approved
          </span>
        )}
        {isFlagged && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
            <AlertCircle className="w-3.5 h-3.5" />
            Flagged for Rework
          </span>
        )}
        {isDisabled && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Pending Review
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        Review all artifacts before approving or requesting rework
      </p>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Action Buttons - Only show for active pending cards */}
      {isActive && isPending && (
        <div className="space-y-2">
          <Button
            onClick={onApprove}
            disabled={isLoading}
            className="w-full bg-green-700 hover:bg-green-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Approve'
            )}
          </Button>
          <button
            onClick={onFlagForRework}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium text-violet-700 bg-white border border-gray-200 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Flag for Rework
          </button>
        </div>
      )}
    </div>
  );
}

export function ReviewStatusSidebar({
  dealId,
  dealName,
  dealStatus,
  assigneeId,
  assigneeName,
  onStatusChange,
}: ReviewStatusSidebarProps) {
  const [updateDealPhase] = useUpdateDealPhaseMutation();
  const [createNotification] = useCreateNotificationMutation();

  // Loading and error states
  const [technicalLoading, setTechnicalLoading] = useState(false);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [dealDeskLoading, setDealDeskLoading] = useState(false);
  const [dealDeskError, setDealDeskError] = useState<string | null>(null);

  // Derive card states from deal status
  const getTechnicalReviewStatus = (): 'pending' | 'approved' | 'flagged' | 'disabled' => {
    switch (dealStatus) {
      case DEAL_STATUS.TECHNICAL_REVIEW:
        return 'pending';
      case DEAL_STATUS.SOW_APPROVED_TECHNICALLY:
      case DEAL_STATUS.DEAL_DESK_REVIEW:
      case DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK:
        return 'approved';
      case DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL:
        return 'flagged';
      default:
        return 'disabled';
    }
  };

  const getDealDeskReviewStatus = (): 'pending' | 'approved' | 'flagged' | 'disabled' => {
    switch (dealStatus) {
      case DEAL_STATUS.SOW_APPROVED_TECHNICALLY:
      case DEAL_STATUS.DEAL_DESK_REVIEW:
        return 'pending';
      case DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK:
        return 'approved';
      case DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK:
        return 'flagged';
      default:
        return 'disabled';
    }
  };

  const technicalStatus = getTechnicalReviewStatus();
  const dealDeskStatus = getDealDeskReviewStatus();

  // Technical Review is active only when status is TECHNICAL_REVIEW
  const isTechnicalReviewActive = dealStatus === DEAL_STATUS.TECHNICAL_REVIEW;
  // Deal Desk Review is active only when technical is approved
  const isDealDeskReviewActive =
    dealStatus === DEAL_STATUS.SOW_APPROVED_TECHNICALLY ||
    dealStatus === DEAL_STATUS.DEAL_DESK_REVIEW;

  // Handle Technical Review Approve
  const handleTechnicalApprove = useCallback(async () => {
    setTechnicalLoading(true);
    setTechnicalError(null);

    try {
      // Update deal status to SOW_APPROVED_TECHNICALLY
      await updateDealPhase({
        dealId,
        status: DEAL_STATUS.SOW_APPROVED_TECHNICALLY,
      }).unwrap();

      // Create notification for SA (assignee) that technical review passed
      if (assigneeId) {
        await createNotification({
          type: 'DEAL_STATUS_UPDATED',
          title: 'Technical Review Approved',
          message: `SOW for "${dealName}" has passed technical review and is now pending Deal Desk review.`,
          owner_id: assigneeId,
          deal_id: dealId,
          deal_name: dealName,
        }).unwrap();
      }

      onStatusChange?.();
    } catch (err: any) {
      console.error('Failed to approve technical review:', err);
      setTechnicalError(err?.data?.message || err?.message || 'Failed to approve');
    } finally {
      setTechnicalLoading(false);
    }
  }, [updateDealPhase, createNotification, dealId, dealName, assigneeId, onStatusChange]);

  // Handle Technical Review Flag for Rework
  const handleTechnicalFlagForRework = useCallback(async () => {
    setTechnicalLoading(true);
    setTechnicalError(null);

    try {
      // Update deal status to SOW_FLAGGED_FOR_REWORK_TECHNICAL
      await updateDealPhase({
        dealId,
        status: DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL,
      }).unwrap();

      // Create notification for SA (assignee) about rework request
      if (assigneeId) {
        await createNotification({
          type: 'SOW_FLAGGED_FOR_REWORK',
          title: 'SOW Flagged for Rework (Technical)',
          message: `SOW for "${dealName}" has been flagged for rework during technical review. Please review and make necessary changes.`,
          owner_id: assigneeId,
          deal_id: dealId,
          deal_name: dealName,
          assignee_name: assigneeName,
        }).unwrap();
      }

      onStatusChange?.();
    } catch (err: any) {
      console.error('Failed to flag for rework:', err);
      setTechnicalError(err?.data?.message || err?.message || 'Failed to flag for rework');
    } finally {
      setTechnicalLoading(false);
    }
  }, [updateDealPhase, createNotification, dealId, dealName, assigneeId, assigneeName, onStatusChange]);

  // Handle Deal Desk Review Approve
  const handleDealDeskApprove = useCallback(async () => {
    setDealDeskLoading(true);
    setDealDeskError(null);

    try {
      // Update deal status to SOW_APPROVED_ON_DEAL_DESK
      await updateDealPhase({
        dealId,
        status: DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK,
      }).unwrap();

      // Create notification for SA (assignee) that deal desk review passed
      if (assigneeId) {
        await createNotification({
          type: 'DEAL_STATUS_UPDATED',
          title: 'Deal Desk Review Approved',
          message: `SOW for "${dealName}" has been fully approved and is ready for funding.`,
          owner_id: assigneeId,
          deal_id: dealId,
          deal_name: dealName,
        }).unwrap();
      }

      onStatusChange?.();
    } catch (err: any) {
      console.error('Failed to approve deal desk review:', err);
      setDealDeskError(err?.data?.message || err?.message || 'Failed to approve');
    } finally {
      setDealDeskLoading(false);
    }
  }, [updateDealPhase, createNotification, dealId, dealName, assigneeId, onStatusChange]);

  // Handle Deal Desk Review Flag for Rework
  const handleDealDeskFlagForRework = useCallback(async () => {
    setDealDeskLoading(true);
    setDealDeskError(null);

    try {
      // Update deal status to SOW_FLAGGED_FOR_REWORK_DEAL_DESK
      await updateDealPhase({
        dealId,
        status: DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK,
      }).unwrap();

      // Create notification for SA (assignee) about rework request
      if (assigneeId) {
        await createNotification({
          type: 'SOW_FLAGGED_FOR_REWORK',
          title: 'SOW Flagged for Rework (Deal Desk)',
          message: `SOW for "${dealName}" has been flagged for rework during Deal Desk review. Please review and make necessary changes.`,
          owner_id: assigneeId,
          deal_id: dealId,
          deal_name: dealName,
          assignee_name: assigneeName,
        }).unwrap();
      }

      onStatusChange?.();
    } catch (err: any) {
      console.error('Failed to flag for rework:', err);
      setDealDeskError(err?.data?.message || err?.message || 'Failed to flag for rework');
    } finally {
      setDealDeskLoading(false);
    }
  }, [updateDealPhase, createNotification, dealId, dealName, assigneeId, assigneeName, onStatusChange]);

  return (
    <div className="w-80 flex-shrink-0 space-y-4">
      {/* Section Header */}
      <h2 className="text-lg font-semibold text-gray-900">Review Status</h2>

      {/* Technical Review Card */}
      <ReviewCard
        title="Technical Review"
        status={technicalStatus}
        isActive={isTechnicalReviewActive}
        isLoading={technicalLoading}
        error={technicalError}
        onApprove={handleTechnicalApprove}
        onFlagForRework={handleTechnicalFlagForRework}
      />

      {/* Connector Line */}
      <div className="flex justify-center">
        <div className="w-px h-6 border-l-2 border-dashed border-gray-300" />
      </div>

      {/* Deal Desk Review Card */}
      <ReviewCard
        title="Deal Desk Review"
        status={dealDeskStatus}
        isActive={isDealDeskReviewActive}
        isLoading={dealDeskLoading}
        error={dealDeskError}
        onApprove={handleDealDeskApprove}
        onFlagForRework={handleDealDeskFlagForRework}
      />

      {/* Connector Line */}
      <div className="flex justify-center">
        <div className="w-px h-6 border-l-2 border-dashed border-gray-300" />
      </div>

      {/* Funding Card (Coming Soon) */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 opacity-50">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Funding</h3>
        <p className="text-sm text-gray-500">Coming Soon</p>
      </div>
    </div>
  );
}
