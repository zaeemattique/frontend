/**
 * Generate SOW Page
 *
 * Page for generating Statement of Work with stepper progress
 * Orchestrates the full SOW generation workflow:
 * 1. Deal information display
 * 2. Context gathering (files, meetings, template, instructions)
 * 3. SOW generation via Step Functions
 * 4. Architecture generation
 * 5. TCO/Pricing calculation
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Stepper, { Step } from '@/components/ui/Stepper';
import { SOWDealDetail, GenerationStep } from '@/components/features/sow/SOWDealDetail';
import { SOWGenerationView, GeneratedArtifact } from '@/components/features/sow/SOWGenerationView';
import {
  useGetDealQuery,
  useGetAvomaMeetingsQuery,
  useSyncAvomaMeetingsMutation,
  useGetExecutionStatusQuery,
  useGetFilesQuery,
  useGetDealMetadataQuery,
} from '@/store/services/api';
import { Loader } from '@/components/ui/Loader';
import { isAtOrPastStage, SOW_GEN_PROGRESS } from '@/utils/dealStatus';

type ViewMode = 'context' | 'generating';

export default function GenerateSOWClient() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;
  const [currentStep, setCurrentStep] = useState(2);
  const [viewMode, setViewMode] = useState<ViewMode>('context');
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [executionArn, setExecutionArn] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [forceContextView, setForceContextView] = useState(false); // Track when user explicitly wants context view
  const [templateId, setTemplateId] = useState<string | null>(null); // Store template ID for TCO/SMC generation

  // Fetch deal data
  const { data: deal, isLoading, error } = useGetDealQuery(dealId);

  // Fetch meetings data
  const { data: meetingsData, refetch: refetchMeetings } = useGetAvomaMeetingsQuery(
    { dealId, companyId: deal?.company_id || '' },
    { skip: !deal?.company_id }
  );

  // Sync Avoma meetings mutation
  const [syncAvomaMeetings, { isLoading: isSyncingAvoma }] = useSyncAvomaMeetingsMutation();

  // Poll execution status when we have an executionArn
  const { data: executionStatus } = useGetExecutionStatusQuery(executionArn || '', {
    skip: !executionArn,
    pollingInterval: executionArn ? 3000 : 0, // Poll every 3 seconds when generating
  });

  // Fetch files for this deal (for generated files), including latest architecture diagram and TCO metadata
  const { data: filesData, isLoading: isLoadingFiles, refetch: refetchFiles } = useGetFilesQuery(
    { company_id: deal?.company_id || '', deal_id: dealId, includeLatestArchitectureDiagram: true, includeLatestTCOEstimate: true },
    { skip: !deal?.company_id || !dealId }
  );

  // Fetch deal metadata to get sow_gen_progress - this is the source of truth for what to show
  const { data: dealMetadata, isLoading: isLoadingMetadata, refetch: refetchMetadata } = useGetDealMetadataQuery(dealId, {
    skip: !dealId,
  });

  // Get current sow_gen_progress from metadata
  const sowGenProgress = dealMetadata?.sow_gen_progress as SowGenProgress | undefined;

  // Handle execution status updates
  useEffect(() => {
    if (!executionStatus) return;

    const status = executionStatus.status;

    if (status === 'RUNNING') {
      // Try to determine current step from output or timing
      const startTime = new Date(executionStatus.startDate).getTime();
      const elapsed = Date.now() - startTime;

      if (elapsed < 30000) {
        setGenerationStep('context');
        setCurrentStep(3);
      } else if (elapsed < 120000) {
        setGenerationStep('sow');
        setCurrentStep(3);
      } else if (elapsed < 180000) {
        setGenerationStep('architecture');
        setCurrentStep(4);
      } else {
        setGenerationStep('pricing');
        setCurrentStep(5);
      }
    } else if (status === 'SUCCEEDED') {
      // Refetch metadata first to get the latest sow_gen_progress, then show UI based on that
      refetchMetadata().then(() => {
        setGenerationStep('completed');
        setCurrentStep(5);
        setExecutionArn(null);
        refetchFiles(); // Refresh file list to show generated files

        // Update artifacts to completed status
        setArtifacts(prev => prev.map(artifact => ({
          ...artifact,
          status: 'completed' as const,
        })));
      });
    } else if (status === 'FAILED' || status === 'TIMED_OUT' || status === 'ABORTED') {
      setGenerationStep('failed');
      setGenerationError(executionStatus.error?.cause || 'Generation failed');
      setExecutionArn(null);

      // Update artifacts to failed status
      setArtifacts(prev => prev.map(artifact => ({
        ...artifact,
        status: 'failed' as const,
      })));
    }
  }, [executionStatus, refetchFiles, refetchMetadata]);

  const handleSyncAvoma = async () => {
    if (!deal?.company_id) return;
    try {
      await syncAvomaMeetings({ dealId, companyId: deal.company_id }).unwrap();
      // Refetch meetings after sync
      refetchMeetings();
    } catch (error) {
      console.error('Failed to sync Avoma meetings:', error);
    }
  };

  // Handle generation start - switch to generation view and set executionArn
  const handleGenerationStart = useCallback((arn: string, selectedTemplateId: string) => {
    // Reset forceContextView when starting generation
    setForceContextView(false);

    setCurrentStep(3);
    setViewMode('generating');
    setGenerationStep('context');
    setExecutionArn(arn);
    setGenerationError(null);
    setTemplateId(selectedTemplateId); // Store template ID for TCO/SMC generation

    // Initialize artifacts with placeholder items
    setArtifacts([
      {
        id: 'sow-1',
        name: `${deal?.dealname || 'Deal'} - SOW Document`,
        type: 'sow',
        version: 1,
        size: '',
        status: 'generating',
      },
    ]);
  }, [deal?.dealname, refetchFiles]);

  // Handle back from generation view - go back to context view to modify context
  const handleBackFromGeneration = useCallback(() => {
    setForceContextView(true);
    setViewMode('context');
    setCurrentStep(2);
    setGenerationStep('idle');
  }, []);

  // Handle save final
  const handleSaveFinal = useCallback(() => {
    // TODO: Implement save logic
    console.log('Save as final');
  }, []);

  // Handle keep generating (Re-generate SOW button)
  const handleKeepGenerating = useCallback(() => {
    setForceContextView(true); // User explicitly wants to go back to context
    setViewMode('context');
    setCurrentStep(2);
    setGenerationStep('idle');
  }, []);

  // Handle architecture generation step change (must be before early returns!)
  const handleArchitectureStepChange = useCallback((isGenerating: boolean) => {
    if (isGenerating) {
      setCurrentStep(4); // Move to "Generating Architecture" step
    }
  }, []);

  // Get generated files array
  const generatedFiles = (filesData?.generated_files || []) as any[];

  // Determine what to show based on sow_gen_progress (source of truth)
  // IMPORTANT: Only show data when status is at or past the GENERATED stage
  // - SOW data: only when at or past SOW_GENERATED
  // - Architecture data: only when at or past ARCHITECTURE_GENERATED
  // - TCO data: only when at or past TCO_GENERATED
  const isSowReady = isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.SOW_GENERATED);
  const isArchitectureReady = isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.ARCHITECTURE_GENERATED);
  const isTcoReady = isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.TCO_GENERATED);

  // Check if currently in a generating state (IN_PROGRESS)
  const isSowGenerating = sowGenProgress === SOW_GEN_PROGRESS.SOW_IN_PROGRESS;
  const isArchitectureGenerating = sowGenProgress === SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS;
  const isTcoGenerating = sowGenProgress === SOW_GEN_PROGRESS.TCO_IN_PROGRESS;

  // Update step and viewMode based on sow_gen_progress (only when not actively generating via Step Functions)
  // Skip auto-switching to generation view if user explicitly requested context view
  useEffect(() => {
    if (forceContextView) {
      // User explicitly wants context view, don't auto-switch
      return;
    }

    // Don't interfere while Step Functions execution is running
    if (executionArn) {
      return;
    }

    if (generationStep === 'idle' || generationStep === 'completed') {
      // Use sow_gen_progress as source of truth, not file presence
      // Note: Architecture and TCO have their own loading states in their components
      // generationStep here refers to the SOW Step Functions execution only
      if (isTcoReady || isTcoGenerating) {
        setCurrentStep(5); // TCO step
        setViewMode('generating');
        // Set to 'completed' - TCONextStep handles its own loading state
        setGenerationStep('completed');
      } else if (isArchitectureReady || isArchitectureGenerating) {
        setCurrentStep(4); // Architecture step
        setViewMode('generating');
        // Set to 'completed' - ArchitectureNextStep handles its own loading state
        setGenerationStep('completed');
      } else if (isSowReady || isSowGenerating) {
        setCurrentStep(3); // SOW step
        setViewMode('generating');
        setGenerationStep(isSowGenerating ? 'sow' : 'completed');
      } else {
        setCurrentStep(2); // Add Context step
        // Keep viewMode as 'context' if not started or in progress
      }
    }
  }, [sowGenProgress, isSowReady, isSowGenerating, isArchitectureReady, isArchitectureGenerating, isTcoReady, isTcoGenerating, generationStep, forceContextView, executionArn]);

  const steps: Step[] = [
    { id: 1, label: 'Deal' },
    { id: 2, label: 'Add Context' },
    { id: 3, label: 'Generating SOW' },
    { id: 4, label: 'Generating Architecture' },
    { id: 5, label: 'Calculating TCO' },
  ];

  // Helper functions (defined before early returns to avoid hook order issues)
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | string | undefined) => {
    if (!amount || amount === '0') return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Early returns AFTER all hooks
  if (isLoading || isLoadingMetadata || (deal?.company_id && isLoadingFiles)) {
    return <Loader text="Loading..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading deal</p>
          <button
            onClick={() => router.push('/deals')}
            className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  // Format Avoma meetings data
  const formattedAvomaMeetings = (meetingsData?.meetings || []).map((meeting: any) => ({
    meeting_id: meeting.meeting_id,
    title: meeting.title || 'Untitled Meeting',
    date: meeting.date,
    duration_minutes: meeting.duration_minutes || 0,
    participants: meeting.participants || [],
    has_recording: meeting.has_recording || false,
    has_transcript: meeting.has_transcript || false,
    has_notes: meeting.has_notes || false,
    meeting_url: meeting.meeting_url || '',
    organizer_email: meeting.organizer_email || '',
    processing_status: meeting.processing_status || '',
    state: meeting.state || '',
    synced_at: meeting.synced_at || '',
    selected: meeting.selected || false,
  }));

  // Get last sync time from selection data
  const lastSyncTime = (meetingsData as any)?.selection?.last_updated;

  return (
    <div className="h-full flex flex-col p-6">
      {/* Stepper - always visible */}
      <div className="mb-1">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto ${viewMode === 'context' ? 'bg-neutral-50 rounded-lg' : ''}`}>
        {viewMode === 'context' ? (
          <SOWDealDetail
            dealId={dealId}
            companyId={deal?.company_id || ''}
            dealName={deal?.dealname || 'Untitled Deal'}
            dealOwner={deal?.hubspot_owner_name || ''}
            fundingType={deal?.funding_program || ''}
            customerSegment={deal?.customer_segment || ''}
            budget={formatCurrency(deal?.amount)}
            targetDate={formatDate(deal?.target_date || deal?.closedate)}
            assignedTo={deal?.assignee?.name || 'Not Assigned'}
            avomaMeetings={formattedAvomaMeetings}
            lastSyncTime={lastSyncTime}
            onSyncAvoma={handleSyncAvoma}
            isSyncingAvoma={isSyncingAvoma}
            onGenerationStart={handleGenerationStart}
          />
        ) : (
          <SOWGenerationView
            dealName={deal?.dealname || 'Untitled Deal'}
            companyId={deal?.company_id || ''}
            dealId={dealId}
            templateId={templateId || undefined}
            isGenerating={generationStep !== 'completed' && generationStep !== 'failed' && generationStep !== 'idle'}
            generationStep={generationStep}
            artifacts={artifacts}
            // Only pass generated files when SOW is at or past SOW_GENERATED status
            generatedFiles={isSowReady ? generatedFiles : []}
            // Only pass architecture diagram when at or past ARCHITECTURE_GENERATED status
            latestArchitectureDiagram={isArchitectureReady ? filesData?.latestArchitectureDiagram : null}
            // Only pass TCO estimate when at or past TCO_GENERATED status
            latestTCOEstimate={isTcoReady ? filesData?.latestTCOEstimate : null}
            errorMessage={generationError}
            onBack={handleBackFromGeneration}
            onSave={handleSaveFinal}
            onKeepGenerating={handleKeepGenerating}
            onArchitectureStepChange={handleArchitectureStepChange}
            onArchitectureComplete={() => {
              refetchFiles();
              refetchMetadata(); // Refresh metadata to get updated sow_gen_progress
            }}
            onTCOComplete={() => {
              refetchFiles();
              refetchMetadata(); // Refresh metadata to get updated sow_gen_progress
            }}
          />
        )}
      </div>
    </div>
  );
}
