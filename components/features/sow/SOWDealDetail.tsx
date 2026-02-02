/**
 * SOW Deal Detail Component
 *
 * Displays deal information form for SOW generation with full backend integration
 * - Persists meeting selections to DynamoDB
 * - Persists template assignment with additional instructions
 * - Handles file uploads for user-provided scoping documents
 * - Triggers SOW generation workflow
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateSelectionItem } from './TemplateSelectionItem';
import { AvomaMeetingsList, AvomaMeeting } from './AvomaMeetingsList';
import { DealTitle } from '@/components/features/deals/DealTitle';
import { Button } from '@/components/ui/Button';
import {
  useGetDocumentTemplatesQuery,
  useGetDealTemplateQuery,
  useAssignDealTemplateMutation,
  useUpdateMeetingSelectionMutation,
  useGenerateSOWMutation,
} from '@/store/services/api';
import {
  Loader2,
  Play,
} from 'lucide-react';

interface SOWDealDetailProps {
  dealId: string;
  companyId: string;
  dealName: string;
  dealOwner: string;
  fundingType: string;
  customerSegment: string;
  budget: string;
  targetDate: string;
  assignedTo: string;
  avomaMeetings?: AvomaMeeting[];
  lastSyncTime?: string;
  onSyncAvoma?: () => void;
  isSyncingAvoma?: boolean;
  onGenerationStart?: (executionArn: string, templateId: string) => void;
}

// Generation step states
export type GenerationStep = 'idle' | 'context' | 'sow' | 'architecture' | 'pricing' | 'completed' | 'failed';

export function SOWDealDetail({
  dealId,
  companyId,
  dealName,
  dealOwner,
  fundingType,
  customerSegment,
  budget,
  targetDate,
  assignedTo,
  avomaMeetings = [],
  lastSyncTime,
  onSyncAvoma,
  isSyncingAvoma = false,
  onGenerationStart,
}: SOWDealDetailProps) {
  const router = useRouter();

  // Local state for form fields
  const [selectedAvomaMeetings, setSelectedAvomaMeetings] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [capacityInfo, setCapacityInfo] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);

  // Meeting selection error state
  const [meetingSelectionError, setMeetingSelectionError] = useState<string | null>(null);

  // Computed: Check if additional instructions are required (no meetings selected)
  const hasNoMeetingsSelected = selectedAvomaMeetings.length === 0;
  const isAdditionalInstructionsRequired = hasNoMeetingsSelected;
  const isAdditionalInstructionsValid = !isAdditionalInstructionsRequired || additionalInstructions.trim().length > 0;

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useGetDocumentTemplatesQuery({ type: 'SOW_TEMPLATE' });

  // Fetch current deal template assignment
  const { data: dealTemplate } = useGetDealTemplateQuery(dealId, {
    skip: !dealId,
  });

  // Mutations
  const [assignDealTemplate] = useAssignDealTemplateMutation();
  const [updateMeetingSelection] = useUpdateMeetingSelectionMutation();
  const [generateSOW] = useGenerateSOWMutation();

  // Initialize form from existing deal template
  useEffect(() => {
    if (dealTemplate) {
      setSelectedTemplate(dealTemplate.template_id);
      setAdditionalInstructions(dealTemplate.additional_instructions || '');
      setCapacityInfo(dealTemplate.capacity_info || '');
    }
  }, [dealTemplate]);

  // Initialize selected meetings from backend data
  useEffect(() => {
    const preSelectedMeetings = avomaMeetings
      .filter((m) => m.selected)
      .map((m) => m.meeting_id);
    if (preSelectedMeetings.length > 0) {
      setSelectedAvomaMeetings(preSelectedMeetings);
    }
  }, [avomaMeetings]);

  // Handle meeting selection toggle with backend persistence (optimistic update)
  const handleAvomaMeetingToggle = useCallback(async (meetingId: string) => {
    // Store previous selection for rollback
    const previousSelection = selectedAvomaMeetings;

    // Optimistic update - immediately show the change
    const newSelection = selectedAvomaMeetings.includes(meetingId)
      ? selectedAvomaMeetings.filter((id) => id !== meetingId)
      : [...selectedAvomaMeetings, meetingId];

    setSelectedAvomaMeetings(newSelection);
    setMeetingSelectionError(null); // Clear any previous error

    // Persist to backend
    try {
      await updateMeetingSelection({
        dealId,
        companyId,
        selectedMeetingIds: newSelection,
      }).unwrap();
    } catch (error) {
      console.error('Failed to update meeting selection:', error);
      // Rollback on error
      setSelectedAvomaMeetings(previousSelection);
      setMeetingSelectionError('Failed to update meeting selection. Please try again.');
    }
  }, [selectedAvomaMeetings, dealId, companyId, updateMeetingSelection]);

  // Handle template selection with backend persistence
  const handleTemplateSelect = useCallback(async (templateId: string) => {
    setSelectedTemplate(templateId);

    // Persist to backend with current instructions
    try {
      await assignDealTemplate({
        dealId,
        templateId,
        additionalInstructions,
        capacityInfo,
      }).unwrap();
    } catch (error) {
      console.error('Failed to assign template:', error);
    }
  }, [dealId, additionalInstructions, capacityInfo, assignDealTemplate]);

  // Handle additional instructions blur - save to backend
  const handleAdditionalInstructionsBlur = useCallback(async () => {
    if (!selectedTemplate) return;

    try {
      await assignDealTemplate({
        dealId,
        templateId: selectedTemplate,
        additionalInstructions,
        capacityInfo,
      }).unwrap();
    } catch (error) {
      console.error('Failed to save additional instructions:', error);
    }
  }, [dealId, selectedTemplate, additionalInstructions, capacityInfo, assignDealTemplate]);

  // Handle capacity info blur - save to backend
  const handleCapacityInfoBlur = useCallback(async () => {
    if (!selectedTemplate) return;

    try {
      await assignDealTemplate({
        dealId,
        templateId: selectedTemplate,
        additionalInstructions,
        capacityInfo,
      }).unwrap();
    } catch (error) {
      console.error('Failed to save capacity info:', error);
    }
  }, [dealId, selectedTemplate, additionalInstructions, capacityInfo, assignDealTemplate]);

  // Handle SOW generation
  const handleStartGeneration = useCallback(async () => {
    // Validation
    if (!selectedTemplate) {
      return;
    }

    // Additional validation: require instructions when no meetings selected
    if (!isAdditionalInstructionsValid) {
      return;
    }

    // Start generation
    setIsGenerating(true);

    try {
      // Ensure template assignment is saved with latest instructions
      // Note: sow_gen_progress is set to SOW_IN_PROGRESS by the backend api_trigger
      await assignDealTemplate({
        dealId,
        templateId: selectedTemplate,
        additionalInstructions,
        capacityInfo,
      }).unwrap();

      // Trigger SOW generation
      const result = await generateSOW({
        deal_id: dealId,
        company_id: companyId,
        template_id: selectedTemplate,
      }).unwrap();

      // Pass execution ARN and template ID to parent to handle polling
      console.log('SOW generation started:', result.executionArn);
      onGenerationStart?.(result.executionArn, selectedTemplate);
    } catch (error: any) {
      console.error('Failed to start SOW generation:', error);
      setIsGenerating(false);
    }
  }, [
    selectedTemplate,
    dealId,
    companyId,
    additionalInstructions,
    capacityInfo,
    assignDealTemplate,
    generateSOW,
    onGenerationStart,
    isAdditionalInstructionsValid,
  ]);

  // Deal information fields array - matching Summary tab in Deal Details
  const dealInfoFields = [
    { label: 'Deal Owner', value: dealOwner },
    { label: 'Funding Type', value: fundingType },
    { label: 'Customer Segment', value: customerSegment },
    { label: 'Budget', value: budget },
    { label: 'Target Date', value: targetDate },
    { label: 'Assigned to', value: assignedTo },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <DealTitle
          dealName={dealName}
          onBack={() => router.push(`/deals/${dealId}`)}
          subtitle="Provide Context"
        />
      </div>

      {/* Deal Information Section */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-neutral-800 mb-4">Deal Information</h3>

        <div className="flex flex-wrap gap-4 bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          {dealInfoFields.map((field, index) => (
            <div key={index} className="min-w-[160px] flex-1 max-w-[200px]">
              <label className="block text-xs text-neutral-800 mb-2 font-medium">{field.label}</label>
              <div className="w-full rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 border border-gray-200">
                {field.value || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avoma Meetings Section */}
      <div className="mb-6">
        <AvomaMeetingsList
          meetings={avomaMeetings}
          selectedMeetings={selectedAvomaMeetings}
          onMeetingToggle={handleAvomaMeetingToggle}
          lastSyncTime={lastSyncTime}
          onSync={onSyncAvoma}
          isSyncing={isSyncingAvoma}
          error={meetingSelectionError}
        />
      </div>

      {/* Select Template Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Select Template <span className="text-red-500">*</span>
          </h3>
          <span className="text-xs text-neutral-800">
            {templates?.length || 0} templates available
          </span>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          {templatesLoading ? (
            <div className="text-center py-8 text-neutral-800 text-sm">
              Loading templates...
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-8 text-neutral-800 text-sm">
              No templates available
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {templates.map((template) => (
                <TemplateSelectionItem
                  key={template.id}
                  id={template.id || ''}
                  name={template.name}
                  description={template.description}
                  previewImage={template.templateFilename ? `/templates/${template.templateFilename}-preview.png` : undefined}
                  isSelected={selectedTemplate === template.id}
                  onClick={() => handleTemplateSelect(template.id || '')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Instructions Section */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Additional Instructions{' '}
          {isAdditionalInstructionsRequired ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="font-normal text-gray-500">(Optional)</span>
          )}
        </label>
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          {isAdditionalInstructionsRequired && (
            <p className="text-xs text-amber-600 mb-2">
              No meetings selected. Please provide context for SOW generation in the field below.
            </p>
          )}
          <textarea
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            onBlur={handleAdditionalInstructionsBlur}
            placeholder={
              isAdditionalInstructionsRequired
                ? "Enter project context, requirements, and any relevant details for SOW generation (required when no meetings are selected)..."
                : "Enter any additional instructions for SOW generation..."
            }
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
              isAdditionalInstructionsRequired && !isAdditionalInstructionsValid
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
            rows={isAdditionalInstructionsRequired ? 5 : 3}
          />
          {isAdditionalInstructionsRequired && !isAdditionalInstructionsValid && (
            <p className="text-xs text-red-500 mt-1">
              This field is required when no meetings are selected.
            </p>
          )}
        </div>
      </div>

      {/* Capacity and Usage Information Section */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-4">
          Capacity and Usage Information for Pricing <span className="font-normal text-gray-500">(Optional)</span>
        </label>
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <textarea
            value={capacityInfo}
            onChange={(e) => setCapacityInfo(e.target.value)}
            onBlur={handleCapacityInfoBlur}
            placeholder="Enter capacity and usage information for pricing calculations..."
            className="w-full px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Start Generating Button */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {!selectedTemplate && (
              <span className="text-amber-600">Please select a template to continue</span>
            )}
            {selectedTemplate && !isAdditionalInstructionsValid && (
              <span className="text-amber-600">Please provide additional instructions (required when no meetings selected)</span>
            )}
            {selectedTemplate && isAdditionalInstructionsValid && !isGenerating && (
              <span>Ready to generate SOW, Architecture, and Pricing documents</span>
            )}
          </div>
          <Button
            onClick={handleStartGeneration}
            disabled={!selectedTemplate || !isAdditionalInstructionsValid || isGenerating}
            variant="primary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Generating
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
