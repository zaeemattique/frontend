/**
 * SOW Generation View Component
 *
 * Displays the generation progress with:
 * - Deal title header
 * - Two-column layout:
 *   - Left: Chat-like interface with Word document cards
 *   - Right: Animated document preview showing generation progress
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import moment from 'moment';
import { Loader2, X, ExternalLink, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AlternatingText } from '@/components/ui/AlternatingText';
import { DealTitle } from '@/components/features/deals/DealTitle';
import { ArchitectureNextStep } from './ArchitectureNextStep';
import { TCONextStep, type LatestTCOEstimate } from './TCONextStep';
export type { LatestTCOEstimate } from './TCONextStep';
import { SOWStepAnimation } from './SOWStepAnimation';
import { useGetDealMetadataQuery, useFinalizeSowMutation } from '@/store/services/api';
import {
  isSOWSavedAsFinal,
  isArchitectureEnabled,
  isTCOEnabled,
  isSOWPhaseComplete,
} from '@/utils/dealStatus';

// Alternating status messages for different generation steps
const SOW_STATUS_MESSAGES = ['Building Context...', 'Generating...'];
const ARCHITECTURE_STATUS_MESSAGES = ['Analyzing requirements...', 'Generating diagram...'];

export interface GeneratedArtifact {
  id: string;
  name: string;
  type: 'sow' | 'architecture' | 'pricing';
  version: number;
  size?: string;
  downloadUrl?: string;
  status: 'generating' | 'completed' | 'failed';
  selected?: boolean;
}

export interface GeneratedFile {
  name?: string;
  file_name?: string;
  key?: string;        // S3 key returned by the API
  file_key?: string;   // Alternative field name
  size?: number;
  download_url?: string;
  last_modified?: string;
  url?: string;        // SharePoint URL for generated files
  source?: 's3' | 'sharepoint';
}

export interface LatestArchitectureDiagram {
  imageUrl: string;
  fileUrl: string;
  generatedAt: string;
}

// SOW Generation Progress states (matches backend)
// Each step has two states:
// - *_IN_PROGRESS: Currently generating, show loading state, hide old data
// - *_GENERATED: Generation complete, show results with Save As Final button
// Final state: SUBMITTED_FOR_REVIEW (deal submitted for technical review)
type SowGenProgress =
  | 'NOT_STARTED'
  | 'SOW_IN_PROGRESS'
  | 'SOW_GENERATED'
  | 'ARCHITECTURE_IN_PROGRESS'
  | 'ARCHITECTURE_GENERATED'
  | 'TCO_IN_PROGRESS'
  | 'TCO_GENERATED'
  | 'READY_FOR_SUBMISSION'
  | 'SUBMITTED_FOR_REVIEW';

interface SOWGenerationViewProps {
  dealName: string;
  companyId: string;
  dealId?: string;
  templateId?: string; // Added for SMC generation in TCO flow
  isGenerating: boolean;
  generationStep: 'idle' | 'context' | 'sow' | 'architecture' | 'pricing' | 'completed' | 'failed';
  artifacts: GeneratedArtifact[];
  generatedFiles?: GeneratedFile[];
  latestArchitectureDiagram?: LatestArchitectureDiagram | null;
  latestTCOEstimate?: LatestTCOEstimate | null;
  errorMessage?: string | null;
  onBack: () => void;
  onSave: () => void;
  onKeepGenerating: () => void;
  onArtifactSelect?: (artifactId: string, selected: boolean) => void;
  onArchitectureStepChange?: (isGenerating: boolean) => void;
  onArchitectureComplete?: () => void;
  onTCOComplete?: () => void;
}

// Word Document Card Component - Chat style
function WordDocumentCard({
  name,
  status,
  version,
  size,
  savedTime,
}: {
  name: string;
  status: 'generating' | 'completed' | 'failed';
  version?: number;
  size?: string;
  savedTime?: string;
}) {
  const isGenerating = status === 'generating';
  const isCompleted = status === 'completed';

  return (
    <div className="w-[280px] rounded-xl bg-violet-50 p-3">
      <div className="flex items-start gap-3">
        {/* Word Icon */}
        <div className="flex-shrink-0">
          <Image
            src="/microsoft_word.svg"
            alt="Word Document"
            width={32}
            height={32}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 leading-tight truncate" title={name}>
            {name}
          </p>

          {/* Status */}
          <div className="mt-1 flex items-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 text-violet-600 animate-spin" />
                <span className="text-xs text-violet-600">In Progress</span>
              </>
            ) : isCompleted ? (
              <span className="text-xs text-neutral-600 truncate">
                {version ? `Version ${version}` : ''} {size && ` ${size}`}
              </span>
            ) : (
              <span className="text-xs text-red-600">Failed</span>
            )}
          </div>
        </div>
      </div>

      {/* Saved status and time */}
      {isCompleted && savedTime && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-green-600 font-medium">Saved</span>
          <span className="text-neutral-500">{savedTime}</span>
        </div>
      )}
    </div>
  );
}

// Status Message Component
function StatusMessage({ text, isError = false }: { text: string; isError?: boolean }) {
  return (
    <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
      {text}
    </p>
  );
}

export function SOWGenerationView({
  dealName,
  companyId,
  dealId,
  templateId,
  isGenerating,
  generationStep,
  artifacts,
  generatedFiles = [],
  latestArchitectureDiagram,
  latestTCOEstimate,
  errorMessage,
  onBack,
  onSave,
  onKeepGenerating,
  onArchitectureStepChange,
  onArchitectureComplete,
  onTCOComplete,
}: SOWGenerationViewProps) {

  // State for SOW Save As Final
  const [isSavingSOW, setIsSavingSOW] = useState(false);

  // Get deal metadata to check sow_gen_progress
  // NOTE: Using exact dealId (not || '') to ensure RTK Query deduplicates with parent component
  const { data: dealMetadata, isLoading: isLoadingMetadata, refetch: refetchMetadata } = useGetDealMetadataQuery(dealId!, {
    skip: !dealId,
  });

  // Mutation for finalizing SOW (deletes versions, renames to FINAL)
  const [finalizeSow] = useFinalizeSowMutation();

  // Get current sow_gen_progress from metadata
  const sowGenProgress: SowGenProgress = dealMetadata?.sow_gen_progress || 'NOT_STARTED';

  // Derive SOW saved state from sowGenProgress - if we're past SOW stage, it was already saved
  const sowSavedAsFinal = isSOWSavedAsFinal(sowGenProgress);

  // Check if Architecture card should be visible (SOW has been saved as final)
  // Architecture is enabled when sowGenProgress is ARCHITECTURE_IN_PROGRESS or later
  const architectureEnabled = isArchitectureEnabled(sowGenProgress);

  // Check if TCO card should be visible (Architecture has been saved as final)
  // TCO_IN_PROGRESS = Architecture saved, TCO calculating (shows "Calculating TCO" state)
  // TCO_GENERATED = TCO calculated, ready for Save As Final (shows results with Save As Final button)
  const tcoEnabled = isTCOEnabled(sowGenProgress);

  // Determine if we're in a "completed" state for showing cards
  // This should be based on sowGenProgress, not generationStep from parent
  // Cards should show when we're at or past SOW_GENERATED, regardless of what parent says
  const sowPhaseComplete = isSOWPhaseComplete(sowGenProgress);

  // Handle SOW Save As Final
  // This calls the finalize-sow endpoint which:
  // 1. Deletes all SOW_Version_*.docx except latest
  // 2. Renames latest to SOW_FINAL_{N}.docx
  // 3. Updates sow_gen_progress to ARCHITECTURE_IN_PROGRESS
  const handleSaveSOWAsFinal = async () => {
    if (!dealId || !companyId) return;

    setIsSavingSOW(true);
    try {
      await finalizeSow({
        companyId,
        dealId,
      }).unwrap();
      // sowSavedAsFinal is derived from sowGenProgress, so we just need to refetch metadata
      refetchMetadata();
    } catch (error) {
      console.error('Failed to save SOW as final:', error);
    } finally {
      setIsSavingSOW(false);
    }
  };

  // Get alternating status messages based on generation step
  const getStatusMessages = (): string[] => {
    switch (generationStep) {
      case 'context':
      case 'sow':
        return SOW_STATUS_MESSAGES;
      case 'architecture':
        return ARCHITECTURE_STATUS_MESSAGES;
      case 'pricing':
        return ['Calculating Pricing...'];
      case 'completed':
        return ['The task is successfully completed.'];
      case 'failed':
        return ['Generation failed.'];
      default:
        return [''];
    }
  };

  // Get the first SOW artifact name for the preview title
  const sowArtifact = artifacts.find(a => a.type === 'sow');
  const previewTitle = sowArtifact?.name?.replace('- SOW Document', '-SOW') || 'SOW Document';

  // Filter to only show .docx files from generated files and sort by last_modified (oldest first, latest at bottom)
  const docxFiles = React.useMemo(() => {
    const files = generatedFiles.filter(file => {
      const fileName = file.name || file.file_name || '';
      return fileName.toLowerCase().endsWith('.docx');
    });
    // Sort by last_modified date - oldest first (so latest appears at bottom)
    return files.sort((a, b) => {
      const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
      const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
      return dateA - dateB;
    });
  }, [generatedFiles]);

  // Ref for the chat content area to enable auto-scroll
  const chatContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new files are added or generation completes
  useEffect(() => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  }, [docxFiles, generationStep, latestArchitectureDiagram, latestTCOEstimate]);

  // Format timestamp for saved files using moment.js
  // Format: "Jan 5, 12:25 PM"
  const formatSavedTime = (dateString?: string) => {
    const date = dateString ? moment(dateString) : moment();

    // Check if date is valid
    if (!date.isValid()) {
      return moment().format('MMM D, h:mm A');
    }

    return date.format('MMM D, h:mm A');
  };

  // Check if generation is complete
  const isComplete = generationStep === 'completed';
  const isFailed = generationStep === 'failed';

  // Show loading state while metadata is loading
  if (isLoadingMetadata) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with Deal Title */}
        <div className="mb-2">
          <DealTitle
            dealName={dealName}
            onBack={onBack}
            subtitle="SOW Generation"
          />
        </div>
        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            <p className="text-sm text-neutral-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Deal Title */}
      <div className="mb-2">
        <DealTitle
          dealName={dealName}
          onBack={onBack}
          subtitle="SOW Generation"
        />
      </div>

      {/* Main Content - Two Column Layout (single column when not generating) */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column - Chat-like interface (full width when not generating) */}
        <div className={`${isGenerating ? 'w-1/2' : 'w-full'} flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden`}>
          {/* Chat content area */}
          <div ref={chatContentRef} className="flex-1 overflow-y-auto p-5">
            <div className="flex flex-col items-start gap-4">
              {/* Show generating status with alternating text */}
              {isGenerating && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                  <AlternatingText
                    messages={getStatusMessages()}
                    interval={4000}
                    className="text-sm text-violet-600"
                  />
                </div>
              )}

              {/* Show in-progress artifacts */}
              {artifacts.map((artifact) => (
                <React.Fragment key={artifact.id}>
                  {artifact.status === 'completed' && (
                    <StatusMessage text="The task is successfully completed." />
                  )}
                  <WordDocumentCard
                    name={artifact.name}
                    status={artifact.status}
                    version={artifact.version}
                    size={artifact.size}
                    savedTime={artifact.status === 'completed' ? formatSavedTime() : undefined}
                  />
                </React.Fragment>
              ))}

              {/* Show completed docx files from backend */}
              {sowPhaseComplete && docxFiles.map((file, index) => (
                <React.Fragment key={`file-${index}`}>
                  <StatusMessage text="The task is successfully completed." />
                  <WordDocumentCard
                    name={file.name || file.file_name || 'Document.docx'}
                    status="completed"
                    version={index + 1}
                    size={file.size ? `${(file.size / 1024).toFixed(2)} KB` : undefined}
                    savedTime={formatSavedTime(file.last_modified)}
                  />
                  {/* View Document link for SharePoint files */}
                  {file.url && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-700 hover:underline font-medium flex items-center gap-2 ml-1"
                    >
                      View Document
                      <ExternalLink className="w-4 h-4 text-blue-700" />
                    </a>
                  )}
                </React.Fragment>
              ))}

              {/* Error message */}
              {isFailed && errorMessage && (
                <div className="w-full max-w-[320px] p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              {/* SOW Action Buttons - Save As Final and Re-generate (shown after SOW completion, before Architecture is enabled) */}
              {sowPhaseComplete && !architectureEnabled && (
                <div className="w-full mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={handleSaveSOWAsFinal}
                    disabled={isSavingSOW || sowSavedAsFinal}
                    className="px-5"
                  >
                    {isSavingSOW ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : sowSavedAsFinal ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved as Final
                      </>
                    ) : (
                      'Save As Final'
                    )}
                  </Button>
                  <button
                    onClick={onKeepGenerating}
                    className="px-5 py-2 text-sm font-medium text-violet-950 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors flex items-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Re-generate SOW
                  </button>
                </div>
              )}

              {/* Next Step - Architecture Generation (shown only after SOW is saved as final) */}
              {sowPhaseComplete && architectureEnabled && (
                <div className="w-full mt-4">
                  <ArchitectureNextStep
                    companyId={companyId}
                    dealId={dealId || ''}
                    dealName={dealName}
                    generatedFiles={generatedFiles}
                    latestArchitectureDiagram={latestArchitectureDiagram}
                    sowGenProgress={sowGenProgress}
                    onRegenerate={onKeepGenerating}
                    onStepChange={onArchitectureStepChange}
                    onComplete={() => {
                      onArchitectureComplete?.();
                      refetchMetadata();
                    }}
                  />
                </div>
              )}

              {/* Next Step - TCO Calculation (shown only after Architecture is saved as final) */}
              {sowPhaseComplete && tcoEnabled && (
                <div className="w-full mt-4">
                  <TCONextStep
                    companyId={companyId}
                    dealId={dealId || ''}
                    dealName={dealName}
                    templateId={templateId}
                    generatedFiles={generatedFiles}
                    latestTCOEstimate={latestTCOEstimate}
                    sowGenProgress={sowGenProgress}
                    onRegenerate={onKeepGenerating}
                    onComplete={onTCOComplete}
                  />
                </div>
              )}

              {/* Retry/Re-generate buttons for failed state */}
              {isFailed && (
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    variant="primary"
                    onClick={onSave}
                    className="px-4 py-2 text-sm"
                  >
                    Retry
                  </Button>
                  <button
                    onClick={onKeepGenerating}
                    className="px-4 py-2 text-sm font-medium text-violet-950 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
                  >
                    Re-generate SOW
                  </button>
                </div>
              )}

              {/* Loading placeholder when no documents yet */}
              {artifacts.length === 0 && isGenerating && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                  <span className="text-sm text-neutral-600">Preparing documents...</span>
                </div>
              )}
            </div>
          </div>

          {/* Generating status box at bottom (only during generation) */}
          {isGenerating && (
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 border border-neutral-300 rounded-lg px-4 py-3">
                <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                <span className="text-sm font-medium text-neutral-500">
                  Generating, please wait...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Document Preview Animation (only during generation) */}
        {isGenerating && (
          <div className="w-1/2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Preview Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-neutral-800 truncate">
                  {previewTitle}
                </span>
              </div>
            </div>

            {/* Content - SOW Animation */}
            <div className="flex-1 overflow-auto bg-gray-50">
              <SOWStepAnimation
                interval={2500}
                fadeDuration={400}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
