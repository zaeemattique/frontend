/**
 * Deal Detail Page
 *
 * Shows deal summary with expandable sections
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { RefreshCw, FileText, ExternalLink, FolderOpen, Send, CheckCircle, XCircle } from 'lucide-react';
import { useGetDealQuery, useGetDealMetadataQuery, useGetFilesQuery, useUpdateDealPhaseMutation, useFinalizeTCOMutation } from '@/store/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSyncAvoma } from '@/hooks/useAutoSyncAvoma';
import { Tabs } from '@/components/ui/Tabs';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DealTitle } from '@/components/features/deals/DealTitle';
import { AvomaMeetingItem } from '@/components/features/sow/AvomaMeetingItem';
import { TranscriptViewer } from '@/components/features/sow/TranscriptViewer';
import { MeetingNotesSection } from '@/components/features/sow/MeetingNotesSection';
import { ReviewStatusSidebar } from '@/components/features/deals/ReviewStatusSidebar';
import {
  isAtOrPastSubmittedForReview,
  canSubmitForReview,
  isInReviewWorkflow,
  SOW_GEN_PROGRESS,
  DEAL_STATUS,
} from '@/utils/dealStatus';

// Valid tab values
type TabId = 'summary' | 'calls' | 'artifacts';
const VALID_TABS: TabId[] = ['summary', 'calls', 'artifacts'];

export default function DealDetailClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  useAuth(); // Ensure user is authenticated
  const dealId = params.dealId as string;
  const { canGenerateSOW, isLeadership, isAE } = usePermissions();

  // Read initial tab from URL query param
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'summary';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync tab state with URL query param
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const url = new URL(window.location.href);
      if (activeTab === 'summary') {
        url.searchParams.delete('tab'); // Default tab doesn't need query param
      } else {
        url.searchParams.set('tab', activeTab);
      }
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [activeTab, searchParams, router]);

  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);
  const [transcriptViewer, setTranscriptViewer] = useState<{
    isOpen: boolean;
    uuid: string;
    title: string;
  }>({ isOpen: false, uuid: '', title: '' });
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ isOpen: false, type: 'success', message: '' });

  // Fetch deal data
  const { data: deal, isLoading, refetch: refetchDeal } = useGetDealQuery(dealId);

  // Fetch deal metadata for status information
  const { data: dealMetadata, refetch: refetchMetadata } = useGetDealMetadataQuery(dealId);

  // Redirect AE users away from artifacts tab if they shouldn't see it
  useEffect(() => {
    const isDealDeskApproved = dealMetadata?.status === DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK;
    if (isAE && activeTab === 'artifacts' && !isDealDeskApproved) {
      setActiveTab('summary');
    }
  }, [isAE, activeTab, dealMetadata?.status]);

  // Fetch meetings data with auto-sync capability and parsed notes
  const {
    meetingsData,
    meetingsLoading,
    firstMeetingId,
    lastSyncTime,
    isSyncing: isSyncingAvoma,
    syncMeetings: handleSyncAvoma,
    parsedNotesData,
    notesLoading,
    notesError,
  } = useAutoSyncAvoma({
    dealId,
    companyId: deal?.company_id,
    fetchNotes: activeTab === 'summary',
  });

  // Fetch files/artifacts for the Artifacts tab
  const { data: filesData, isLoading: filesLoading } = useGetFilesQuery(
    { company_id: deal?.company_id || '', deal_id: dealId },
    { skip: !deal?.company_id || activeTab !== 'artifacts' }
  );

  // Update deal phase mutation (for Submit for Review)
  const [updateDealPhase] = useUpdateDealPhaseMutation();

  // Finalize TCO mutation (for Submit for Review)
  const [finalizeTCO] = useFinalizeTCOMutation();

  const handleSubmitForReview = async () => {
    if (!deal || !deal.company_id) return;
    setIsSubmittingForReview(true);
    try {
      // Step 1: Finalize TCO (renames SMC files to FINAL versions)
      await finalizeTCO({
        companyId: deal.company_id,
        dealId,
      }).unwrap();

      // Step 2: Update deal phase to TECHNICAL_REVIEW
      // Backend handles: sow_gen_progress -> SUBMITTED_FOR_REVIEW, notification to Leadership
      await updateDealPhase({ dealId, status: 'TECHNICAL_REVIEW' }).unwrap();

      // Refetch metadata to update UI
      refetchMetadata();

      setFeedbackModal({
        isOpen: true,
        type: 'success',
        message: 'SOW submitted for review successfully!',
      });
    } catch (error) {
      console.error('Failed to submit for review:', error);
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        message: 'Failed to submit for review. Please try again.',
      });
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  const handleViewTranscript = (uuid: string, title: string) => {
    setTranscriptViewer({ isOpen: true, uuid, title });
  };

  const handleCloseTranscript = () => {
    setTranscriptViewer({ isOpen: false, uuid: '', title: '' });
  };

  // AE users can only see Artifacts tab after deal is Deal Desk approved
  const canAEViewArtifacts = !isAE || dealMetadata?.status === DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK;

  const tabs = [
    { id: 'summary' as const, label: 'Summary' },
    { id: 'calls' as const, label: 'Calls and Transcript' },
    ...(canAEViewArtifacts ? [{ id: 'artifacts' as const, label: 'Artifacts' }] : [])
  ];

  // Helper functions to format data
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount: number | string | undefined) => {
    if (!amount || amount === 0) return '-';
    try {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(num)) return '-';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(num);
    } catch {
      return '-';
    }
  };


  // Format Avoma meetings data for AvomaMeetingsList component
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
    transcription_uuid: meeting.transcription_uuid || meeting.meeting_id,
  }));

  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return 'Never';

    const now = new Date();
    const sync = new Date(syncTime);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return <Loader text="Loading deal details..." />;
  }

  const dealName = deal?.dealname || 'Untitled Deal';

  // Prepare deal info fields from API data - matching the design
  const dealInfoFields = [
    { label: 'Deal Owner', value: deal?.hubspot_owner_name || '-' },
    { label: 'Funding Type', value: deal?.funding_program || '-' },
    { label: 'Customer Segment', value: deal?.customer_segment || '-' },
    { label: 'Budget', value: formatCurrency(deal?.amount) },
    { label: 'Target Date', value: formatDate(deal?.target_date || deal?.closedate) },
    { label: 'Assigned to', value: deal?.assignee?.name || 'Not Assigned' },
  ];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with Back Button, Title, and Action Button */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <DealTitle
            dealName={dealName}
            onBack={() => router.push('/deals')}
            className="flex-1 min-w-0"
          />

          {/* Action Buttons - Only visible for Leadership, SA, and Admin */}
          {canGenerateSOW && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => router.push(`/generate-sow/${dealId}`)}
                variant="secondary"
                className="w-full md:w-auto"
              >
                {isAtOrPastSubmittedForReview(dealMetadata?.sow_gen_progress, dealMetadata?.status)
                  ? 'Re-generate SOW'
                  : 'Generate SOW'}
              </Button>
              {/* Submit for Review - Only visible when SOW has been generated */}
              {canSubmitForReview(dealMetadata?.sow_gen_progress, dealMetadata?.status) && (
                <Button
                  onClick={handleSubmitForReview}
                  disabled={isSubmittingForReview || dealMetadata?.sow_gen_progress === SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW}
                  className="w-full md:w-auto flex items-center gap-2"
                >
                  {dealMetadata?.sow_gen_progress === SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submitted for Review
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {isSubmittingForReview ? 'Submitting...' : 'Submit for Review'}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Info Cards - Flex Row Layout with Wrap */}
        <div className="flex flex-wrap gap-4">
          {dealInfoFields.map((field, index) => (
            <div key={index} className="bg-white rounded-lg p-4 min-w-[160px] flex-1 max-w-[200px] flex flex-col">
              <p className="text-xs text-gray-500 mb-1">{field.label}</p>
              <p className="text-sm font-medium text-gray-900">{field.value}</p>
            </div>
          ))}
        </div>

        {/* Meeting Notes Sections - from first meeting */}
        <MeetingNotesSection
          sections={parsedNotesData?.sections || []}
          isLoading={notesLoading || meetingsLoading}
          error={notesError ? ((notesError as any)?.data?.error || 'Failed to load meeting notes') : (!firstMeetingId && !meetingsLoading ? 'No meetings found for this deal' : null)}
        />
        </div>
      )}

      {/* Calls and Transcript Tab */}
      {activeTab === 'calls' && (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Meetings List Section - Hidden on small screens when transcript is open */}
          <div className={`flex-1 overflow-y-auto space-y-4 ${transcriptViewer.isOpen ? 'hidden xl:block min-w-0' : ''}`}>
            {/* Sync Button Row */}
            <div className="flex items-center justify-end gap-3">
              <span className="text-xs text-neutral-600">
                Last sync: {formatLastSync(lastSyncTime)}
              </span>
              <button
                onClick={handleSyncAvoma}
                disabled={isSyncingAvoma}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-900 bg-white border border-primary-900 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAvoma ? 'animate-spin' : ''}`} />
                {isSyncingAvoma ? 'Syncing...' : 'Sync Avoma'}
              </button>
            </div>

            {/* Meetings List (vertical column layout) */}
            {meetingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader text="Loading meetings..." />
              </div>
            ) : formattedAvomaMeetings.length === 0 ? (
              <div className="text-center py-8 text-neutral-600 text-sm">
                No Avoma meetings found for this deal
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {formattedAvomaMeetings.map((meeting: any) => (
                  <AvomaMeetingItem
                    key={meeting.meeting_id}
                    meeting={meeting}
                    showSelector={false}
                    onViewTranscript={handleViewTranscript}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcript Viewer Panel - Inside the tab */}
          {transcriptViewer.isOpen && (
            <div className="w-full xl:w-1/2 xl:min-w-[500px] xl:max-w-[800px] flex-shrink-0 h-full rounded-lg overflow-hidden">
              <TranscriptViewer
                transcriptionUuid={transcriptViewer.uuid}
                meetingTitle={transcriptViewer.title}
                onClose={handleCloseTranscript}
              />
            </div>
          )}
        </div>
      )}

      {/* Artifacts Tab - Grid of Latest Versions (SOW, Architecture, SMCs) + Review Status Sidebar */}
      {activeTab === 'artifacts' && (
        <div className="flex-1 flex gap-6 overflow-y-auto">
          {/* Main Artifacts Content */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Loading State */}
            {filesLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader text="Loading artifacts..." />
              </div>
            )}

            {/* Grid of Latest Artifacts */}
            {(() => {
            const sharepointFiles = [
              ...(filesData?.generated_files || []),
              ...(filesData?.main_files || [])
            ].filter((file: any) => file.source === 'sharepoint');

            // Helper to get latest file by type
            const getLatestByType = (files: any[], pattern: RegExp) => {
              const matching = files.filter((f: any) => pattern.test(f.name?.toLowerCase() || ''));
              if (matching.length === 0) return null;
              // Sort by last_modified descending and return the latest
              return matching.sort((a: any, b: any) => {
                const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
                const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
                return dateB - dateA;
              })[0];
            };

            // Get latest of each type (prefer Version files as they are latest work in progress, fall back to FINAL)
            const latestSOW = getLatestByType(sharepointFiles, /sow_version.*\.docx$/i) ||
                              getLatestByType(sharepointFiles, /sow_final.*\.docx$/i) ||
                              getLatestByType(sharepointFiles, /sow.*\.docx$/i);
            const latestArchitecture = getLatestByType(sharepointFiles, /architecture.*version.*\.(png|jpg|jpeg|svg|pdf)$/i) ||
                                       getLatestByType(sharepointFiles, /architecture.*final.*\.(png|jpg|jpeg|svg|pdf)$/i) ||
                                       getLatestByType(sharepointFiles, /architecture.*\.(png|jpg|jpeg|svg|pdf)$/i) ||
                                       getLatestByType(sharepointFiles, /diagram.*\.(png|jpg|jpeg|svg|pdf)$/i);
            // Get Essential and Growth SMC separately
            // File naming: SMC_Essential_Version_N.md, SMC_Essential_FINAL_N.md
            // Prefer Version files as they are latest work in progress
            const latestEssentialSMC = getLatestByType(sharepointFiles, /smc_essential_version.*\.md$/i) ||
                                       getLatestByType(sharepointFiles, /smc_essential_final.*\.md$/i) ||
                                       getLatestByType(sharepointFiles, /smc_essential.*\.md$/i) ||
                                       getLatestByType(sharepointFiles, /essential.*smc.*\.md$/i);
            const latestGrowthSMC = getLatestByType(sharepointFiles, /smc_growth_version.*\.md$/i) ||
                                    getLatestByType(sharepointFiles, /smc_growth_final.*\.md$/i) ||
                                    getLatestByType(sharepointFiles, /smc_growth.*\.md$/i) ||
                                    getLatestByType(sharepointFiles, /growth.*smc.*\.md$/i);

            const hasAnyArtifact = latestSOW || latestArchitecture || latestEssentialSMC || latestGrowthSMC;

            return (
              <>
                {/* No Artifacts State */}
                {!filesLoading && !hasAnyArtifact && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No artifacts found for this deal.</p>
                    <p className="text-xs text-gray-400 mt-1">Generate a SOW to create artifacts.</p>
                  </div>
                )}

                {/* Artifacts Grid - 4 columns (SOW, Architecture, Essential SMC, Growth SMC) */}
                {!filesLoading && hasAnyArtifact && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* SOW Card */}
                    {latestSOW ? (
                      <a
                        href={latestSOW.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col hover:border-violet-300 hover:shadow-sm transition-all group cursor-pointer overflow-hidden"
                      >
                        {/* Top row: Date + External Link */}
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-500">
                            {latestSOW.last_modified
                              ? new Date(latestSOW.last_modified).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                }) + ' at ' + new Date(latestSOW.last_modified).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                }).toLowerCase()
                              : '—'}
                          </p>
                          <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-violet-600 flex-shrink-0" />
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-violet-950 mb-3 truncate" title={latestSOW.name}>
                          {latestSOW.name?.replace(/\.docx$/i, '') || 'SOW Document'}
                        </h3>

                        {/* Bottom row: Word icon + Size */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <Image
                            src="/microsoft_word.svg"
                            alt="Word Document"
                            width={24}
                            height={24}
                          />
                          <span className="text-sm text-neutral-500">
                            {latestSOW.size ? `${(latestSOW.size / 1024).toFixed(2)} KB` : '—'}
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col opacity-60">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-400">—</p>
                          <ExternalLink className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                        <h3 className="text-base font-semibold text-violet-950 mb-3">SOW Document</h3>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <Image
                            src="/microsoft_word.svg"
                            alt="Word Document"
                            width={24}
                            height={24}
                            className="opacity-50"
                          />
                          <span className="text-sm text-neutral-400">Not generated yet</span>
                        </div>
                      </div>
                    )}

                    {/* Architecture Card */}
                    {latestArchitecture ? (
                      <a
                        href={latestArchitecture.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col hover:border-violet-300 hover:shadow-sm transition-all group cursor-pointer overflow-hidden"
                      >
                        {/* Top row: Date + External Link */}
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-500">
                            {latestArchitecture.last_modified
                              ? new Date(latestArchitecture.last_modified).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                }) + ' at ' + new Date(latestArchitecture.last_modified).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                }).toLowerCase()
                              : '—'}
                          </p>
                          <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-violet-600 flex-shrink-0" />
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-violet-950 mb-3 truncate" title={latestArchitecture.name}>
                          {latestArchitecture.name?.replace(/\.(png|jpg|jpeg|svg|pdf)$/i, '') || 'Architecture'}
                        </h3>

                        {/* Bottom row: PNG icon + Size */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <Image
                            src="/png.svg"
                            alt="PNG File"
                            width={24}
                            height={24}
                          />
                          <span className="text-sm text-neutral-500">
                            {latestArchitecture.size ? `${(latestArchitecture.size / 1024).toFixed(2)} KB` : '—'}
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col opacity-60">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-400">—</p>
                          <ExternalLink className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                        <h3 className="text-base font-semibold text-violet-950 mb-3">Architecture</h3>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <Image
                            src="/png.svg"
                            alt="PNG File"
                            width={24}
                            height={24}
                            className="opacity-50"
                          />
                          <span className="text-sm text-neutral-400">Not generated yet</span>
                        </div>
                      </div>
                    )}

                    {/* Essential SMC Card */}
                    {latestEssentialSMC ? (
                      <a
                        href={`${latestEssentialSMC.url}?web=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col hover:border-violet-300 hover:shadow-sm transition-all group cursor-pointer overflow-hidden"
                      >
                        {/* Top row: Date + External Link */}
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-500">
                            {latestEssentialSMC.last_modified
                              ? new Date(latestEssentialSMC.last_modified).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                }) + ' at ' + new Date(latestEssentialSMC.last_modified).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                }).toLowerCase()
                              : '—'}
                          </p>
                          <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-violet-600 flex-shrink-0" />
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-violet-950 mb-3 truncate" title={latestEssentialSMC.name}>
                          Essential SMC
                        </h3>

                        {/* Bottom row: MD icon + Size */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <FileText className="w-6 h-6 text-blue-600" />
                          <span className="text-sm text-neutral-500">
                            {latestEssentialSMC.size ? `${(latestEssentialSMC.size / 1024).toFixed(2)} KB` : '—'}
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col opacity-60">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-400">—</p>
                          <ExternalLink className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                        <h3 className="text-base font-semibold text-violet-950 mb-3">Essential SMC</h3>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <FileText className="w-6 h-6 text-gray-400" />
                          <span className="text-sm text-neutral-400">Not generated yet</span>
                        </div>
                      </div>
                    )}

                    {/* Growth SMC Card */}
                    {latestGrowthSMC ? (
                      <a
                        href={`${latestGrowthSMC.url}?web=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col hover:border-violet-300 hover:shadow-sm transition-all group cursor-pointer overflow-hidden"
                      >
                        {/* Top row: Date + External Link */}
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-500">
                            {latestGrowthSMC.last_modified
                              ? new Date(latestGrowthSMC.last_modified).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                }) + ' at ' + new Date(latestGrowthSMC.last_modified).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                }).toLowerCase()
                              : '—'}
                          </p>
                          <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-violet-600 flex-shrink-0" />
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-violet-950 mb-3 truncate" title={latestGrowthSMC.name}>
                          Growth SMC
                        </h3>

                        {/* Bottom row: MD icon + Size */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <FileText className="w-6 h-6 text-green-600" />
                          <span className="text-sm text-neutral-500">
                            {latestGrowthSMC.size ? `${(latestGrowthSMC.size / 1024).toFixed(2)} KB` : '—'}
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-5 pb-3 flex flex-col opacity-60">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm text-neutral-400">—</p>
                          <ExternalLink className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                        <h3 className="text-base font-semibold text-violet-950 mb-3">Growth SMC</h3>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <FileText className="w-6 h-6 text-gray-400" />
                          <span className="text-sm text-neutral-400">Not generated yet</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
          </div>

          {/* Review Status Sidebar - Only visible for Leadership when deal is in review workflow */}
          {isLeadership && isInReviewWorkflow(dealMetadata?.status) && (
            <ReviewStatusSidebar
              dealId={dealId}
              dealName={dealName}
              dealStatus={dealMetadata.status}
              assigneeId={deal?.assignee?.id}
              assigneeName={deal?.assignee?.name}
              onStatusChange={() => {
                refetchDeal();
                refetchMetadata();
              }}
            />
          )}
        </div>
      )}
      </div>

      {/* Feedback Modal */}
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        size="sm"
        showCloseButton={false}
      >
        <div className="text-center py-4">
          {feedbackModal.type === 'success' ? (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          )}
          <p className="text-gray-900 font-medium mb-6">{feedbackModal.message}</p>
          <Button
            onClick={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
            className="px-6"
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}
