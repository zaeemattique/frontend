/**
 * TCO Next Step Component
 *
 * Card component for generating AWS TCO pricing estimate after Architecture completion
 * Shows a "Next Step" prompt with action buttons and displays the AWS Console link
 *
 * Uses async pattern: triggers Step Function and waits for WebSocket events
 * Also displays existing TCO estimate if tco_metadata_*.json file exists
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ArrowRight, Loader2, ExternalLink, DollarSign, Check, RotateCcw, Send, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useGenerateTCOMutation, useGetFilesQuery, useUpdateDealPhaseMutation, useUpdateSowGenProgressMutation } from '@/store/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useExecutionPolling } from '@/hooks/useExecutionPolling';
import { isTCOGenerated, isReadyForSubmission, isTCOEnabled, SOW_GEN_PROGRESS } from '@/utils/dealStatus';

interface GeneratedFile {
  name?: string;
  file_name?: string;
  key?: string;
  file_key?: string;
  size?: number;
  download_url?: string;
  url?: string; // SharePoint webUrl or S3 URL
  last_modified?: string;
  source?: 'sharepoint' | 's3';
}

export interface LatestTCOEstimate {
  totalCost: number | null;
  currency: string;
  generatedAt: string;
}

interface TCONextStepProps {
  companyId: string;
  dealId: string;
  dealName: string; // Added for SMC generation
  templateId?: string; // Added for SMC generation
  generatedFiles: GeneratedFile[];
  latestTCOEstimate?: LatestTCOEstimate | null;
  sowGenProgress?: string; // Used to derive saved state from database
  onRegenerate: () => void;
  onStepChange?: (isGenerating: boolean) => void;
  onComplete?: () => void; // Called when TCO calculation completes (to refresh files)
}

export function TCONextStep({
  companyId,
  dealId,
  dealName,
  templateId,
  generatedFiles,
  latestTCOEstimate,
  sowGenProgress,
  onRegenerate,
  onStepChange,
  onComplete,
}: TCONextStepProps) {
  // Use RTK Query to get files data (returns from cache)
  const { data: filesData } = useGetFilesQuery(
    { company_id: companyId, deal_id: dealId },
    { skip: !companyId || !dealId }
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalCost: number | null;
    currency: string;
  } | null>(null);
  const isGeneratingRef = useRef(false);

  const [generateTCO] = useGenerateTCOMutation();

  // Polling hook for Step Function execution status
  const polling = useExecutionPolling({
    onSuccess: () => {
      console.log('[TCODebug] TCO Step Function succeeded (polling)');
      setIsGenerating(false);
      isGeneratingRef.current = false;
      onComplete?.();
    },
    onError: (errorMessage) => {
      console.log('[TCODebug] TCO Step Function failed (polling):', errorMessage);
      setError(errorMessage);
      setIsGenerating(false);
      isGeneratingRef.current = false;
    },
  });

  const [updateDealPhase] = useUpdateDealPhaseMutation();
  const [updateSowGenProgress] = useUpdateSowGenProgressMutation();

  // Save As Final state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Submit for Review state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Handle Save As Final - updates sow_gen_progress to READY_FOR_SUBMISSION
  const handleSaveAsFinal = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Update sow_gen_progress to READY_FOR_SUBMISSION
      await updateSowGenProgress({ dealId, progress: 'READY_FOR_SUBMISSION' }).unwrap();

      console.log('[TCODebug] TCO saved as final successfully');
      onComplete?.(); // This will refetch metadata and update state
    } catch (err: any) {
      console.error('Failed to save TCO as final:', err);
      setSaveError(err?.data?.message || err?.message || 'Failed to save as final');
    } finally {
      setIsSaving(false);
    }
  }, [updateSowGenProgress, dealId, onComplete]);

  // Handle Submit for Review - updates deal status to TECHNICAL_REVIEW
  // Backend automatically handles: sow_gen_progress update and Leadership notification
  const handleSubmitForReview = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Update deal phase to TECHNICAL_REVIEW
      // Backend handles: sow_gen_progress -> SUBMITTED_FOR_REVIEW, notification to Leadership
      await updateDealPhase({ dealId, status: 'TECHNICAL_REVIEW' }).unwrap();

      console.log('[TCODebug] Submitted for review successfully');
      setShowSuccessModal(true); // Show success modal
      onComplete?.(); // This will refetch metadata and update isAlreadySubmitted
    } catch (err: any) {
      console.error('Failed to submit for review:', err);
      setSubmitError(err?.data?.message || err?.message || 'Failed to submit for review');
    } finally {
      setIsSubmitting(false);
    }
  }, [updateDealPhase, dealId, onComplete]);

  // Use the latestTCOEstimate prop directly (already simplified server-side)
  // Show existing estimate when TCO has been generated (TCO_GENERATED, READY_FOR_SUBMISSION, or SUBMITTED_FOR_REVIEW)
  // Don't show during TCO_IN_PROGRESS (currently calculating)
  const existingEstimate = React.useMemo(() => {
    // Only show cached estimate if TCO is generated or we're past that stage
    const showEstimateStages = [
      SOW_GEN_PROGRESS.TCO_GENERATED,
      SOW_GEN_PROGRESS.READY_FOR_SUBMISSION,
      SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW,
    ];
    if (!sowGenProgress || !showEstimateStages.includes(sowGenProgress as any)) {
      return null;
    }

    if (!latestTCOEstimate) return null;

    const { totalCost, currency } = latestTCOEstimate;
    if (totalCost !== null && totalCost !== undefined) {
      return { totalCost, currency };
    }
    return null;
  }, [latestTCOEstimate, sowGenProgress]);

  // Handle WebSocket messages for TCO calculation events
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('[TCODebug] ========== WebSocket Message Received ==========');
    console.log('[TCODebug] Raw message:', JSON.stringify(message, null, 2));
    console.log('[TCODebug] isGeneratingRef.current:', isGeneratingRef.current);
    console.log('[TCODebug] message.type:', message?.type);
    console.log('[TCODebug] message.data:', message?.data);
    console.log('[TCODebug] message.data?.type:', message?.data?.type);

    // Only process if we're actively generating and haven't already handled completion
    if (!isGeneratingRef.current || polling.isHandled()) {
      console.log('[TCODebug] Ignoring message - not currently generating or already handled');
      return;
    }

    // WebSocket message format: { type: "notification", data: { type: "tco_calculation_completed", ... } }
    const eventType = message.data?.type || message.type;
    console.log('[TCODebug] Extracted eventType:', eventType);

    if (eventType === 'tco_calculation_completed') {
      console.log('[TCODebug] ✅ MATCHED: tco_calculation_completed');
      polling.markHandled(); // Prevent duplicate handling from polling
      const data = message.data || message;
      console.log('[TCODebug] Extracted data:', data);
      console.log('[TCODebug] totalCost:', data.totalCost);
      console.log('[TCODebug] currency:', data.currency);
      setResult({
        totalCost: data.totalCost || null,
        currency: data.currency || 'USD',
      });
      setIsGenerating(false);
      isGeneratingRef.current = false;
      // Notify parent to refresh files and update step
      onComplete?.();
      console.log('[TCODebug] State updated - isGenerating set to false');
    } else if (eventType === 'tco_calculation_failed') {
      console.log('[TCODebug] ❌ MATCHED: tco_calculation_failed');
      polling.markHandled(); // Prevent duplicate handling from polling
      const data = message.data || message;
      setError(data.error || 'TCO calculation failed');
      setIsGenerating(false);
      isGeneratingRef.current = false;
      console.log('[TCODebug] State updated - error set');
    } else {
      console.log('[TCODebug] ⚪ No match for eventType:', eventType);
    }
    console.log('[TCODebug] ================================================');
  }, [onComplete, polling]);

  // Connect to WebSocket with message handler
  useWebSocket({
    enabled: true,
    onMessage: handleWebSocketMessage,
  });

  // Find the latest Architecture file from generated files
  const getLatestArchitectureFile = useCallback(() => {
    const archFiles = generatedFiles.filter(file => {
      const fileName = file.name || file.file_name || '';
      return fileName.startsWith('Architecture') && fileName.endsWith('.md');
    });

    if (archFiles.length === 0) return null;

    // Sort by last_modified (most recent first)
    archFiles.sort((a, b) => {
      const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
      const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
      return dateB - dateA;
    });

    return archFiles[0];
  }, [generatedFiles]);

  // Extract folder path from SharePoint URL (from RTK cache)
  // URL format: https://{hostname}/sites/{siteName}/{libraryName}/{folderPath}
  // Example: https://cloudelligent.sharepoint.com/sites/OscarShared/Shared%20Documents/41659515955-ZigZag
  const getSharepointFolderPath = useCallback(() => {
    const sharepointFolderUrl = filesData?.sharepoint_folder_url;
    if (!sharepointFolderUrl) return undefined;
    try {
      const url = new URL(sharepointFolderUrl);
      // Path: /sites/OscarShared/Shared%20Documents/41659515955-ZigZag
      const pathParts = url.pathname.split('/');
      // The folder name is always the last part of the path
      const folderName = pathParts[pathParts.length - 1];
      return folderName ? decodeURIComponent(folderName) : undefined;
    } catch {
      // If URL parsing fails, return undefined
    }
    return undefined;
  }, [filesData?.sharepoint_folder_url]);

  // Handle TCO generation
  // Uses latest Architecture file to generate cost estimates
  const handleGenerateTCO = useCallback(async () => {
    const latestArchFile = getLatestArchitectureFile();

    if (!latestArchFile) {
      setError('No Architecture file found. Please generate SOW first.');
      return;
    }

    const s3Key = latestArchFile.key || latestArchFile.file_key;
    if (!s3Key) {
      setError('Architecture file key not found.');
      return;
    }

    // SharePoint folder path is optional - TCO can be generated without it
    // The backend will handle creating the folder if needed
    const folderPath = getSharepointFolderPath();

    console.log('[TCODebug] ========== Starting Generation ==========');
    console.log('[TCODebug] s3Key:', s3Key);
    console.log('[TCODebug] sharepointFolderPath:', folderPath || '(not available - will skip SharePoint upload)');
    console.log('[TCODebug] dealId:', dealId);
    console.log('[TCODebug] dealName:', dealName);

    setIsGenerating(true);
    isGeneratingRef.current = true;
    polling.resetHandled(); // Reset completion flag for new generation
    setError(null);
    setResult(null);

    // Notify parent that TCO generation has started (to update stepper)
    onStepChange?.(true);

    try {
      // Now includes SMC generation parameters (Essential & Growth SMC will be generated first)
      const response = await generateTCO({
        s3Key,
        sharepointFolderPath: folderPath,
        dealId,
        customer: companyId,
        project: dealName,
        templateId,
      }).unwrap();

      // Check if response contains direct results (new cost estimator)
      // or just executionArn (async Step Function)
      if (response.totalMonthlyCost !== undefined || response.totalCost !== undefined) {
        // New cost estimator returns results directly
        console.log('[TCODebug] Received direct results from cost estimator');
        setResult({
          totalCost: response.totalMonthlyCost ?? response.totalCost ?? null,
          currency: 'USD',
        });
        setIsGenerating(false);
        isGeneratingRef.current = false;
        onComplete?.();
      } else if (response.executionArn) {
        // Async Step Function - start polling for completion
        console.log('[TCODebug] TCO calculation started, executionArn:', response.executionArn);
        console.log('[TCODebug] Starting polling for completion...');
        polling.startPolling(response.executionArn);
        // Results will come via WebSocket or polling (whichever completes first)
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err: any) {
      console.error('Failed to start TCO calculation:', err);
      setError(err?.data?.message || err?.message || 'Failed to start TCO calculation');
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  }, [getLatestArchitectureFile, getSharepointFolderPath, generateTCO, onStepChange, onComplete, dealId, companyId, dealName, templateId, polling]);

  // Check if Architecture file exists
  const hasArchitectureFile = generatedFiles.some(file => {
    const fileName = file.name || file.file_name || '';
    return fileName.startsWith('Architecture') && fileName.endsWith('.md');
  });

  if (!hasArchitectureFile) {
    return null;
  }

  // Find latest SMC files from generated files or filesData
  // Combine both sources and sort by last_modified to get the latest
  const allFiles: GeneratedFile[] = [
    ...generatedFiles,
    ...((filesData?.generated_files || []) as GeneratedFile[]),
    ...((filesData?.files || []) as GeneratedFile[]),
  ];

  // Filter and sort Essential SMC files (latest first)
  const essentialSMCFiles = allFiles
    .filter(file => {
      const fileName = file.name || file.file_name || '';
      return fileName.includes('Essential') && fileName.includes('SMC');
    })
    .sort((a, b) => {
      const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
      const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
      return dateB - dateA; // Latest first
    });

  // Filter and sort Growth SMC files (latest first)
  const growthSMCFiles = allFiles
    .filter(file => {
      const fileName = file.name || file.file_name || '';
      return fileName.includes('Growth') && fileName.includes('SMC');
    })
    .sort((a, b) => {
      const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
      const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
      return dateB - dateA; // Latest first
    });

  // Get the latest file, preferring SharePoint (has clickable URL)
  const essentialSMCFile = essentialSMCFiles.find(f => f.source === 'sharepoint') || essentialSMCFiles[0];
  const growthSMCFile = growthSMCFiles.find(f => f.source === 'sharepoint') || growthSMCFiles[0];

  // Determine if we have an existing estimate
  // Only consider SMC files as valid if we're at TCO_GENERATED or READY_FOR_SUBMISSION stage
  // When progress is TCO_IN_PROGRESS (currently calculating), show loading state
  const hasSMCFilesFromCurrentRun = (isTCOGenerated(sowGenProgress) || isReadyForSubmission(sowGenProgress)) && !!(essentialSMCFile || growthSMCFile);

  // hasExistingEstimate should only be true if:
  // 1. We just calculated TCO in this session (result), OR
  // 2. We have a valid existing estimate from TCO_GENERATED stage (existingEstimate), OR
  // 3. TCO is generated and we have SMC files (hasSMCFilesFromCurrentRun)
  const hasExistingEstimate = !!(result || existingEstimate || hasSMCFilesFromCurrentRun);
  const estimateData = result || existingEstimate;

  // Format currency
  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return 'Calculating...';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4 max-w-[30vw]">
      {/* Next Step Card - Only show when at TCO_IN_PROGRESS stage and no estimate exists */}
      {sowGenProgress === SOW_GEN_PROGRESS.TCO_IN_PROGRESS && !hasExistingEstimate && (
        <div className="bg-gradient-to-r from-blue-50/50 to-white rounded-xl border border-blue-100 p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-neutral-600">Next Step</span>
            <ArrowRight className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold text-neutral-800">Calculate TCO</span>
          </div>

          {/* Description */}
          <p className="text-sm text-neutral-600 mb-4">
            Run a TCO calculation to estimate migration, operational, and comparative cloud costs.
          </p>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* TCO Result - Shows when estimate exists */}
      {estimateData && (
        <div className="space-y-3">
          {/* Cost Summary Card */}
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Growth Estimated Monthly AWS Cost</p>
                <p className="text-xl font-semibold text-neutral-800">
                  {formatCurrency(estimateData.totalCost, estimateData.currency)}/month
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SMC File Links - Only show when TCO is generated, saved, or submitted (not during in-progress or earlier stages) */}
      {(sowGenProgress === SOW_GEN_PROGRESS.TCO_GENERATED || sowGenProgress === SOW_GEN_PROGRESS.READY_FOR_SUBMISSION || sowGenProgress === SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW) && (essentialSMCFile || growthSMCFile) && (
        <div className="space-y-2">
          {essentialSMCFile && (essentialSMCFile.url || essentialSMCFile.download_url) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Essential SMC</span>
              <span className="text-neutral-400">|</span>
              <a
                href={`${essentialSMCFile.url || essentialSMCFile.download_url}?web=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-700 hover:underline flex items-center gap-1"
              >
                Sharepoint Essential SMC MD
                <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
              </a>
            </div>
          )}
          {growthSMCFile && (growthSMCFile.url || growthSMCFile.download_url) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Growth SMC</span>
              <span className="text-neutral-400">|</span>
              <a
                href={`${growthSMCFile.url || growthSMCFile.download_url}?web=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-700 hover:underline flex items-center gap-1"
              >
                Sharepoint Growth SMC MD
                <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons - Show based on sowGenProgress stage */}
      {isTCOEnabled(sowGenProgress) && (
        <div className="flex items-center gap-3">
          {/* TCO_IN_PROGRESS: Show Calculate TCO + Re-generate SOW */}
          {sowGenProgress === SOW_GEN_PROGRESS.TCO_IN_PROGRESS && (
            <>
              <Button
                variant="primary"
                onClick={handleGenerateTCO}
                disabled={isGenerating}
                className="px-5 text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate TCO'
                )}
              </Button>
            </>
          )}

          {/* TCO_GENERATED: Show Save As Final + Re-generate SOW */}
          {sowGenProgress === SOW_GEN_PROGRESS.TCO_GENERATED && (
            <Button
              variant="primary"
              onClick={handleSaveAsFinal}
              disabled={isSaving}
              className="px-5 text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save As Final
                </>
              )}
            </Button>
          )}

          {/* READY_FOR_SUBMISSION: Show Submit for Review + Re-generate SOW */}
          {sowGenProgress === SOW_GEN_PROGRESS.READY_FOR_SUBMISSION && (
            <Button
              variant="primary"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              className="px-5 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Review
                </>
              )}
            </Button>
          )}

          {/* SUBMITTED_FOR_REVIEW: Show greyed out Submit for Review + Re-generate SOW */}
          {sowGenProgress === SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW && (
            <Button
              variant="primary"
              disabled={true}
              className="px-5 text-sm"
            >
              <Check className="w-4 h-4" />
              Submitted for Review
            </Button>
          )}

          {/* Re-generate SOW button - always visible at TCO stages */}
          <button
            onClick={onRegenerate}
            className="px-5 py-2 text-sm font-medium text-violet-950 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors flex items-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Re-generate SOW
          </button>

          {/* Submit Error Message */}
          {submitError && (
            <span className="text-sm text-red-600">{submitError}</span>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* Close button */}
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-blue-600" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Submit SOW for Review?
              </h3>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                Are you sure you want to submit the SOW for <span className="font-medium">{dealName}</span> for technical review? The leadership team will be notified.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleSubmitForReview();
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Yes, Submit'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* Close button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                SOW Submitted for Review
              </h3>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                Your SOW for <span className="font-medium">{dealName}</span> has been successfully submitted for technical review. The leadership team will be notified.
              </p>

              {/* Action Button */}
              <Button
                variant="primary"
                onClick={() => setShowSuccessModal(false)}
                className="px-6"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
