/**
 * Architecture Next Step Component
 *
 * Card component for generating architecture diagram after SOW completion
 * Shows a "Next Step" prompt with action buttons
 *
 * Uses async pattern: triggers Step Function and waits for WebSocket events
 * Also displays existing diagram if diagram_metadata_*.json file exists
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ArrowRight, Loader2, ExternalLink, Maximize2, Minimize2, Check, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useGenerateDiagramMutation, useSaveDiagramToSharePointMutation, useFinalizeArchitectureMutation } from '@/store/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useExecutionPolling } from '@/hooks/useExecutionPolling';
import {
  isArchitectureSaved,
  shouldShowCachedArchitecture,
  showArchitectureButtons,
  isTCOEnabled,
  SOW_GEN_PROGRESS,
} from '@/utils/dealStatus';

interface GeneratedFile {
  name?: string;
  file_name?: string;
  key?: string;
  file_key?: string;
  size?: number;
  download_url?: string;
  last_modified?: string;
}

export interface LatestArchitectureDiagram {
  imageUrl: string;
  fileUrl: string;
  generatedAt: string;
}

interface ArchitectureNextStepProps {
  companyId: string;
  dealId: string;
  dealName: string;
  generatedFiles: GeneratedFile[];
  latestArchitectureDiagram?: LatestArchitectureDiagram | null;
  sowGenProgress?: string; // Used to derive saved state from database
  onRegenerate: () => void;
  onStepChange?: (isGenerating: boolean) => void;
  onComplete?: () => void; // Called when diagram generation completes (to refresh files)
}

export function ArchitectureNextStep({
  companyId,
  dealId,
  dealName,
  generatedFiles,
  latestArchitectureDiagram,
  sowGenProgress,
  onRegenerate,
  onStepChange,
  onComplete,
}: ArchitectureNextStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imageUrl: string; fileUrl: string } | null>(null);
  const isGeneratingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  // Derive initial saved state from sowGenProgress - if progress is past architecture, it was already saved as final
  const [savedToSharePoint, setSavedToSharePoint] = useState(isArchitectureSaved(sowGenProgress));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const [generateDiagram] = useGenerateDiagramMutation();
  const [saveDiagramToSharePoint] = useSaveDiagramToSharePointMutation();
  const [finalizeArchitecture] = useFinalizeArchitectureMutation();

  // Polling hook for Step Function execution status
  const polling = useExecutionPolling({
    onSuccess: () => {
      console.log('[DiagramDebug] Architecture Step Function succeeded (polling)');
      setIsGenerating(false);
      isGeneratingRef.current = false;
      onComplete?.();
    },
    onError: (errorMessage) => {
      console.log('[DiagramDebug] Architecture Step Function failed (polling):', errorMessage);
      setError(errorMessage);
      setIsGenerating(false);
      isGeneratingRef.current = false;
    },
  });

  // Use the latestArchitectureDiagram prop directly (already simplified server-side)
  // Only show existing diagram if we're at ARCHITECTURE_GENERATED or later (not IN_PROGRESS)
  const existingDiagram = React.useMemo(() => {
    // Don't show cached diagram from previous runs if we're at SOW stage or architecture is still in progress
    if (!shouldShowCachedArchitecture(sowGenProgress)) {
      return null;
    }

    if (!latestArchitectureDiagram) return null;

    const { imageUrl, fileUrl } = latestArchitectureDiagram;
    if (imageUrl && fileUrl) {
      return { imageUrl, fileUrl };
    }
    return null;
  }, [latestArchitectureDiagram, sowGenProgress]);

  // Handle WebSocket messages for diagram generation events
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('[DiagramDebug] ========== WebSocket Message Received ==========');
    console.log('[DiagramDebug] Raw message:', JSON.stringify(message, null, 2));
    console.log('[DiagramDebug] isGeneratingRef.current:', isGeneratingRef.current);
    console.log('[DiagramDebug] message.type:', message?.type);
    console.log('[DiagramDebug] message.data:', message?.data);
    console.log('[DiagramDebug] message.data?.type:', message?.data?.type);

    // Only process if we're actively generating and haven't already handled completion
    if (!isGeneratingRef.current || polling.isHandled()) {
      console.log('[DiagramDebug] Ignoring message - not currently generating or already handled');
      return;
    }

    // WebSocket message format: { type: "notification", data: { type: "diagram_generation_completed", ... } }
    const eventType = message.data?.type || message.type;
    console.log('[DiagramDebug] Extracted eventType:', eventType);

    if (eventType === 'diagram_generation_completed') {
      console.log('[DiagramDebug] ✅ MATCHED: diagram_generation_completed');
      polling.markHandled(); // Prevent duplicate handling from polling
      const data = message.data || message;
      console.log('[DiagramDebug] Extracted data:', data);
      console.log('[DiagramDebug] imageUrl:', data.imageUrl);
      console.log('[DiagramDebug] fileUrl:', data.fileUrl);
      console.log('[DiagramDebug] sharePointUrl:', data.sharePointUrl);
      setResult({
        imageUrl: data.imageUrl,
        fileUrl: data.fileUrl,
      });
      setIsGenerating(false);
      isGeneratingRef.current = false;

      // SharePoint save is now handled in backend (eraser_diagram Lambda)
      // Just notify parent to refresh files
      onComplete?.();
      console.log('[DiagramDebug] State updated - isGenerating set to false');
    } else if (eventType === 'diagram_generation_started') {
      console.log('[DiagramDebug] ✅ MATCHED: diagram_generation_started');
      // Just log it, generation is in progress
    } else if (eventType === 'diagram_generation_failed') {
      console.log('[DiagramDebug] ❌ MATCHED: diagram_generation_failed');
      polling.markHandled(); // Prevent duplicate handling from polling
      const data = message.data || message;
      setError(data.error || 'Diagram generation failed');
      setIsGenerating(false);
      isGeneratingRef.current = false;
      console.log('[DiagramDebug] State updated - error set');
    } else {
      console.log('[DiagramDebug] ⚪ No match for eventType:', eventType);
    }
    console.log('[DiagramDebug] ================================================');
  }, [onComplete, polling]);

  // Connect to WebSocket with message handler
  useWebSocket({
    enabled: true,
    onMessage: handleWebSocketMessage,
  });

  // Find the latest Architecture file from generated files (used for diagram generation)
  const getLatestArchitectureFile = useCallback(() => {
    const architectureFiles = generatedFiles.filter(file => {
      const fileName = file.name || file.file_name || '';
      return fileName.startsWith('Architecture') && fileName.endsWith('.md');
    });

    if (architectureFiles.length === 0) return null;

    // Sort by last_modified (most recent first)
    architectureFiles.sort((a, b) => {
      const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
      const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
      return dateB - dateA;
    });

    return architectureFiles[0];
  }, [generatedFiles]);

  // Handle diagram generation (async - triggers Step Function)
  const handleGenerateArchitecture = useCallback(async () => {
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

    console.log('[DiagramDebug] ========== Starting Generation ==========');
    console.log('[DiagramDebug] s3Key:', s3Key);
    console.log('[DiagramDebug] customer:', companyId);
    console.log('[DiagramDebug] project:', dealName);

    setIsGenerating(true);
    isGeneratingRef.current = true;
    polling.resetHandled(); // Reset completion flag for new generation
    setError(null);
    setResult(null);

    // Notify parent that architecture generation has started (to update stepper)
    onStepChange?.(true);

    console.log('[DiagramDebug] isGeneratingRef.current set to:', isGeneratingRef.current);

    try {
      // This triggers the Step Function and returns immediately
      const response = await generateDiagram({
        s3Key,
        customer: companyId,
        project: dealName,
      }).unwrap();

      console.log('[DiagramDebug] Diagram generation started, executionArn:', response.executionArn);

      // Start polling for completion
      if (response.executionArn) {
        console.log('[DiagramDebug] Starting polling for completion...');
        polling.startPolling(response.executionArn);
      }

      // Results will come via WebSocket or polling (whichever completes first)
    } catch (err: any) {
      console.error('Failed to start diagram generation:', err);
      setError(err?.data?.message || err?.message || 'Failed to start diagram generation');
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  }, [getLatestArchitectureFile, generateDiagram, companyId, dealName, onStepChange, polling]);

  // Handle Save As Final - finalizes architecture diagram in SharePoint
  // Renames Architecture_Diagram_Version_N.png to Architecture_Diagram_FINAL_N.png
  // Also updates sow_gen_progress to TCO_IN_PROGRESS
  const handleSaveAsFinal = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Call the finalize endpoint which handles file operations and progress update
      const response = await finalizeArchitecture({
        companyId,
        dealId,
      }).unwrap();

      console.log('[DiagramDebug] Architecture finalized in SharePoint:', response);
      setSavedToSharePoint(true);

      // Refresh files list
      onComplete?.();
    } catch (err: any) {
      console.error('Failed to finalize architecture:', err);
      setSaveError(err?.data?.message || err?.message || 'Failed to finalize architecture');
    } finally {
      setIsSaving(false);
    }
  }, [finalizeArchitecture, companyId, dealId, onComplete]);

  // Handle Sync - fetches latest diagram from Eraser and saves to SharePoint
  const handleSyncDiagram = useCallback(async () => {
    const currentDiagram = result || existingDiagram;
    if (!currentDiagram?.imageUrl) {
      setSaveError('No diagram available to sync');
      return;
    }

    setIsSyncing(true);
    setSaveError(null);
    setSyncSuccess(false);

    try {
      // Re-fetch the PNG from Eraser and save to SharePoint with incremented version
      // Skip status update since this is just syncing the updated image (not changing workflow state)
      const response = await saveDiagramToSharePoint({
        companyId,
        dealId,
        customerName: dealName,
        imageUrl: currentDiagram.imageUrl,
        skipStatusUpdate: true,
      }).unwrap();

      console.log('[DiagramDebug] Diagram synced to SharePoint:', response);
      setSyncSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => setSyncSuccess(false), 3000);

      // Refresh files list
      onComplete?.();
    } catch (err: any) {
      console.error('Failed to sync diagram to SharePoint:', err);
      setSaveError(err?.data?.message || err?.message || 'Failed to sync diagram');
    } finally {
      setIsSyncing(false);
    }
  }, [result, existingDiagram, saveDiagramToSharePoint, companyId, dealId, dealName, onComplete]);

  // Check if Architecture or Implementation file exists
  const hasArchitectureFile = generatedFiles.some(file => {
    const fileName = file.name || file.file_name || '';
    return (fileName.startsWith('Architecture') || fileName.startsWith('Implementation')) && fileName.endsWith('.md');
  });

  if (!hasArchitectureFile) {
    return null;
  }

  // Determine if we have an existing diagram
  const hasExistingDiagram = !!(result || existingDiagram);

  const diagramData = result || existingDiagram;

  // Show action buttons when sowGenProgress is ARCHITECTURE_IN_PROGRESS or ARCHITECTURE_GENERATED
  // - ARCHITECTURE_IN_PROGRESS: User clicked "Save As Final" on SOW, can now generate diagram
  // - ARCHITECTURE_GENERATED: Diagram exists, can save as final or re-generate
  const canShowArchitectureButtons = showArchitectureButtons(sowGenProgress);

  return (
    <div className={`space-y-4 ${isExpanded ? 'max-w-full' : 'max-w-[30vw]'} transition-all duration-300`}>
        {/* Next Step Card - Only show when no diagram exists */}
        {!hasExistingDiagram && (
          <div className="bg-gradient-to-r from-rose-50/50 to-white rounded-xl border border-rose-100 p-5">
            {/* Header - Shows "Next Step → Generate Architecture" */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-neutral-600">Next Step</span>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-semibold text-neutral-800">Generate Architecture</span>
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-600 mb-4">
              The architecture diagram will be generated based on the final version of SOW.
            </p>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Diagram Preview - Shows when diagram available */}
        {diagramData && (
          <div className="space-y-3">
            {/* Image Preview with expand button */}
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white group">
              <img
                src={diagramData.imageUrl}
                alt="Architecture Diagram"
                className="w-full h-auto object-contain"
                onError={(e) => {
                  console.error('[DiagramDebug] Failed to load diagram image');
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Expand/Collapse button - appears on hover */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute top-3 right-3 p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                title={isExpanded ? "Collapse image" : "Expand image"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Eraser Link - styled like the screenshot */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <a
                href={diagramData.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-700 hover:underline font-medium flex items-center gap-2"
              >
                Eraser Link
                <ExternalLink className="w-4 h-4 text-blue-700" />
              </a>
              <span className="text-sm text-neutral-600 flex-1">Click this link to manually refine the architecture.</span>
              {/* Sync Button - Temporarily hidden due to issues
              {isArchitectureSaved(sowGenProgress) && (
                <button
                  onClick={handleSyncDiagram}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : syncSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      Synced
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync
                    </>
                  )}
                </button>
              )}
              */}
            </div>
          </div>
        )}

        {/* Action Buttons - Show when sowGenProgress is ARCHITECTURE_IN_PROGRESS or ARCHITECTURE_GENERATED */}
        {canShowArchitectureButtons && (
          <div className="flex items-center gap-3">
            {/* Show Generate Architecture button only when no diagram exists */}
            {!hasExistingDiagram && (
              <>
                <Button
                  variant="primary"
                  onClick={handleGenerateArchitecture}
                  disabled={isGenerating}
                  className="px-5"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Architecture'
                  )}
                </Button>
                <button
                  onClick={onRegenerate}
                  disabled={isGenerating}
                  className="px-5 py-2 text-sm font-medium text-violet-950 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Re-generate SOW
                </button>
              </>
            )}

            {/* When diagram exists, show Save As Final */}
            {hasExistingDiagram && (
              <>
                <Button
                  variant="primary"
                  onClick={handleSaveAsFinal}
                  disabled={isSaving || savedToSharePoint}
                  className="px-5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : savedToSharePoint ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved to SharePoint
                    </>
                  ) : (
                    'Save As Final'
                  )}
                </Button>
                <button
                  onClick={onRegenerate}
                  className="px-5 py-2 text-sm font-medium text-violet-950 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Re-generate SOW
                </button>
              </>
            )}
            {/* Save Error Message */}
            {saveError && (
              <span className="text-sm text-red-600">{saveError}</span>
            )}
          </div>
        )}
    </div>
  );
}
