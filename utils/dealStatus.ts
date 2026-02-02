/**
 * Deal Status Helper Utilities
 *
 * Centralized helper functions for deal status, phase, and SOW generation progress checks.
 * Use these instead of inline arrays in UI components for consistency and maintainability.
 */

// =============================================================================
// STATUS CONSTANTS
// =============================================================================

/**
 * Deal review workflow statuses
 */
export const DEAL_STATUS = {
  TECHNICAL_REVIEW: 'TECHNICAL_REVIEW',
  SOW_APPROVED_TECHNICALLY: 'SOW_APPROVED_TECHNICALLY',
  DEAL_DESK_REVIEW: 'DEAL_DESK_REVIEW',
  SOW_APPROVED_ON_DEAL_DESK: 'SOW_APPROVED_ON_DEAL_DESK',
  SOW_FLAGGED_FOR_REWORK_TECHNICAL: 'SOW_FLAGGED_FOR_REWORK_TECHNICAL',
  SOW_FLAGGED_FOR_REWORK_DEAL_DESK: 'SOW_FLAGGED_FOR_REWORK_DEAL_DESK',
} as const;

/**
 * SOW generation progress stages in order
 */
export const SOW_GEN_PROGRESS = {
  NOT_STARTED: 'NOT_STARTED',
  SOW_IN_PROGRESS: 'SOW_IN_PROGRESS',
  SOW_GENERATED: 'SOW_GENERATED',
  ARCHITECTURE_IN_PROGRESS: 'ARCHITECTURE_IN_PROGRESS',
  ARCHITECTURE_GENERATED: 'ARCHITECTURE_GENERATED',
  TCO_IN_PROGRESS: 'TCO_IN_PROGRESS',
  TCO_GENERATED: 'TCO_GENERATED',
  READY_FOR_SUBMISSION: 'READY_FOR_SUBMISSION',
  SUBMITTED_FOR_REVIEW: 'SUBMITTED_FOR_REVIEW',
} as const;

/**
 * Deal phase statuses
 */
export const DEAL_PHASE = {
  UN_ASSIGNED: 'UN_ASSIGNED',
  SA_ASSIGNED: 'SA_ASSIGNED',
  SOW_IN_PROGRESS: 'SOW_IN_PROGRESS',
} as const;

// =============================================================================
// STATUS ARRAYS (for includes checks)
// =============================================================================

/**
 * All review workflow statuses
 */
export const REVIEW_WORKFLOW_STATUSES = [
  DEAL_STATUS.TECHNICAL_REVIEW,
  DEAL_STATUS.SOW_APPROVED_TECHNICALLY,
  DEAL_STATUS.DEAL_DESK_REVIEW,
  DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK,
  DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL,
  DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK,
] as const;

/**
 * Technical review phase statuses
 */
export const TECHNICAL_REVIEW_STATUSES = [
  DEAL_STATUS.TECHNICAL_REVIEW,
  DEAL_STATUS.SOW_APPROVED_TECHNICALLY,
  DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL,
] as const;

/**
 * Deal desk review phase statuses
 */
export const DEAL_DESK_REVIEW_STATUSES = [
  DEAL_STATUS.DEAL_DESK_REVIEW,
  DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK,
  DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK,
] as const;

/**
 * Statuses at or past "Submitted for Review" stage
 */
export const SUBMITTED_OR_PAST_STATUSES = [
  SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW,
  ...REVIEW_WORKFLOW_STATUSES,
] as const;

/**
 * Statuses at or past "SOW Generated" stage (can submit for review)
 */
export const SOW_GENERATED_OR_PAST_STATUSES = [
  SOW_GEN_PROGRESS.SOW_GENERATED,
  SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS,
  SOW_GEN_PROGRESS.ARCHITECTURE_GENERATED,
  SOW_GEN_PROGRESS.TCO_IN_PROGRESS,
  SOW_GEN_PROGRESS.TCO_GENERATED,
  SOW_GEN_PROGRESS.READY_FOR_SUBMISSION,
  ...SUBMITTED_OR_PAST_STATUSES,
] as const;

/**
 * SOW generation progress order for linear progression checks
 */
export const SOW_GEN_PROGRESS_ORDER = [
  SOW_GEN_PROGRESS.NOT_STARTED,
  SOW_GEN_PROGRESS.SOW_IN_PROGRESS,
  SOW_GEN_PROGRESS.SOW_GENERATED,
  SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS,
  SOW_GEN_PROGRESS.ARCHITECTURE_GENERATED,
  SOW_GEN_PROGRESS.TCO_IN_PROGRESS,
  SOW_GEN_PROGRESS.TCO_GENERATED,
  SOW_GEN_PROGRESS.READY_FOR_SUBMISSION,
  SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW,
] as const;

// =============================================================================
// LABEL MAPPINGS
// =============================================================================

/**
 * Phase display labels for deals table
 */
export const PHASE_DISPLAY_LABELS: Record<string, string> = {
  // Phase statuses
  [DEAL_PHASE.UN_ASSIGNED]: 'Unassigned',
  [DEAL_PHASE.SA_ASSIGNED]: 'SA Assigned',
  [DEAL_PHASE.SOW_IN_PROGRESS]: 'SOW In Progress',
  // Review statuses grouped by phase
  [DEAL_STATUS.TECHNICAL_REVIEW]: 'Technical Review',
  [DEAL_STATUS.SOW_APPROVED_TECHNICALLY]: 'Technical Review',
  [DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL]: 'Technical Review',
  [DEAL_STATUS.DEAL_DESK_REVIEW]: 'Deal Desk Review',
  [DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK]: 'Deal Desk Review',
  [DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK]: 'Deal Desk Review',
};

/**
 * Comprehensive status labels for search and display
 */
export const STATUS_LABELS: Record<string, string> = {
  // Phase statuses
  [DEAL_PHASE.UN_ASSIGNED]: 'Unassigned',
  [DEAL_PHASE.SA_ASSIGNED]: 'SA Assigned',
  [DEAL_PHASE.SOW_IN_PROGRESS]: 'SOW In Progress',
  // SOW generation progress statuses
  [SOW_GEN_PROGRESS.NOT_STARTED]: 'Not Started',
  [SOW_GEN_PROGRESS.SOW_GENERATED]: 'SOW Generated',
  [SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS]: 'Architecture In Progress',
  [SOW_GEN_PROGRESS.ARCHITECTURE_GENERATED]: 'Architecture Generated',
  [SOW_GEN_PROGRESS.TCO_IN_PROGRESS]: 'TCO In Progress',
  [SOW_GEN_PROGRESS.TCO_GENERATED]: 'TCO Generated',
  [SOW_GEN_PROGRESS.READY_FOR_SUBMISSION]: 'Ready for Submission',
  [SOW_GEN_PROGRESS.SUBMITTED_FOR_REVIEW]: 'Submitted for Review',
  // Review workflow statuses
  [DEAL_STATUS.TECHNICAL_REVIEW]: 'Pending Review (Technical)',
  [DEAL_STATUS.SOW_APPROVED_TECHNICALLY]: 'Deal Desk Pending',
  [DEAL_STATUS.DEAL_DESK_REVIEW]: 'Pending Review (Deal Desk)',
  [DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK]: 'Approved (Deal Desk)',
  [DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL]: 'Rework (Technical)',
  [DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK]: 'Rework (Deal Desk)',
};

/**
 * Status badge configuration for deals table
 */
export interface StatusBadgeConfig {
  label: string;
  variant: 'blue' | 'green' | 'orange' | 'gray';
}

export const STATUS_BADGE_CONFIG: Record<string, StatusBadgeConfig> = {
  [DEAL_STATUS.TECHNICAL_REVIEW]: { label: 'Pending Review', variant: 'blue' },
  [DEAL_STATUS.SOW_APPROVED_TECHNICALLY]: { label: 'Deal Desk Pending', variant: 'blue' },
  [DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL]: { label: 'Rework', variant: 'orange' },
  [DEAL_STATUS.DEAL_DESK_REVIEW]: { label: 'Pending Review', variant: 'blue' },
  [DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK]: { label: 'Approved', variant: 'green' },
  [DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK]: { label: 'Rework', variant: 'orange' },
};

/**
 * Special filter value for all pre-submission stages combined
 */
export const SOW_SUBMISSION_PENDING_FILTER = '__SOW_SUBMISSION_PENDING__';

/**
 * All pre-submission stages that map to "SOW Submission (Pending)" filter
 * Uses status field values only (no sow_gen_progress dependency)
 */
export const PRE_SUBMISSION_STAGES = [
  DEAL_PHASE.SA_ASSIGNED,
  DEAL_PHASE.SOW_IN_PROGRESS,
];

/**
 * Status filter options for deals table dropdown
 * Includes both pre-submission (SOW generation) and review workflow statuses
 */
export const STATUS_FILTER_OPTIONS = [
  // Pre-submission stages (combined into one option)
  { value: SOW_SUBMISSION_PENDING_FILTER, label: 'SOW Submission (Pending)' },
  // Review workflow statuses
  { value: DEAL_STATUS.TECHNICAL_REVIEW, label: 'Pending Review (Technical)' },
  { value: DEAL_STATUS.SOW_APPROVED_TECHNICALLY, label: 'Pending Review (Deal Desk)' },
  { value: DEAL_STATUS.SOW_APPROVED_ON_DEAL_DESK, label: 'Approved (Deal Desk)' },
  { value: DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_TECHNICAL, label: 'Rework (Technical)' },
  { value: DEAL_STATUS.SOW_FLAGGED_FOR_REWORK_DEAL_DESK, label: 'Rework (Deal Desk)' },
];

/**
 * Deal stage categories for filtering (maps to HubSpot deal stages)
 */
export const DEAL_STAGE_FILTER_OPTIONS = [
  { value: 'technical_validation', label: 'Technical Validation' },
  { value: 'business_validation', label: 'Business Validation' },
  { value: 'committed', label: 'Committed' },
  { value: 'deal_lost', label: 'Deal Lost' },
];

// =============================================================================
// HELPER FUNCTIONS - Review Workflow
// =============================================================================

/**
 * Check if deal is in any review workflow status
 */
export function isInReviewWorkflow(status?: string): boolean {
  return REVIEW_WORKFLOW_STATUSES.includes(status as any);
}

/**
 * Check if deal is in technical review phase
 */
export function isInTechnicalReview(status?: string): boolean {
  return TECHNICAL_REVIEW_STATUSES.includes(status as any);
}

/**
 * Check if deal is in deal desk review phase
 */
export function isInDealDeskReview(status?: string): boolean {
  return DEAL_DESK_REVIEW_STATUSES.includes(status as any);
}

// =============================================================================
// HELPER FUNCTIONS - SOW Generation Progress
// =============================================================================

/**
 * Check if current progress is at or past a given stage
 */
export function isAtOrPastStage(
  currentProgress: string | undefined,
  targetStage: string
): boolean {
  if (!currentProgress) return false;
  const currentIndex = SOW_GEN_PROGRESS_ORDER.indexOf(currentProgress as any);
  const targetIndex = SOW_GEN_PROGRESS_ORDER.indexOf(targetStage as any);
  return currentIndex >= targetIndex && currentIndex !== -1 && targetIndex !== -1;
}

/**
 * Check if deal is at or past "Submitted for Review" stage
 */
export function isAtOrPastSubmittedForReview(
  sowGenProgress?: string,
  dealStatus?: string
): boolean {
  return (
    SUBMITTED_OR_PAST_STATUSES.includes(sowGenProgress as any) ||
    SUBMITTED_OR_PAST_STATUSES.includes(dealStatus as any)
  );
}

/**
 * Check if SOW has been generated (can submit for review)
 */
export function canSubmitForReview(
  sowGenProgress?: string,
  dealStatus?: string
): boolean {
  return (
    SOW_GENERATED_OR_PAST_STATUSES.includes(sowGenProgress as any) ||
    SOW_GENERATED_OR_PAST_STATUSES.includes(dealStatus as any)
  );
}

/**
 * Check if SOW phase is complete (SOW_GENERATED or later)
 */
export function isSOWPhaseComplete(sowGenProgress?: string): boolean {
  if (!sowGenProgress) return false;
  return isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.SOW_GENERATED);
}

/**
 * Check if SOW has been saved as final (past SOW_GENERATED)
 */
export function isSOWSavedAsFinal(sowGenProgress?: string): boolean {
  if (!sowGenProgress) return false;
  return isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS);
}

/**
 * Check if Architecture step is enabled
 */
export function isArchitectureEnabled(sowGenProgress?: string): boolean {
  if (!sowGenProgress) return false;
  return isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS);
}

/**
 * Check if Architecture has been generated (ARCHITECTURE_GENERATED or later)
 */
export function isArchitectureGenerated(sowGenProgress?: string): boolean {
  if (!sowGenProgress) return false;
  return isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.ARCHITECTURE_GENERATED);
}

/**
 * Check if Architecture has been saved (TCO_IN_PROGRESS or later)
 */
export function isArchitectureSaved(sowGenProgress?: string): boolean {
  if (!sowGenProgress) return false;
  return isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.TCO_IN_PROGRESS);
}

/**
 * Check if TCO step is enabled
 */
export function isTCOEnabled(sowGenProgress?: string): boolean {
  if (!sowGenProgress) return false;
  return isAtOrPastStage(sowGenProgress, SOW_GEN_PROGRESS.TCO_IN_PROGRESS);
}

/**
 * Check if TCO has been generated
 */
export function isTCOGenerated(sowGenProgress?: string): boolean {
  return sowGenProgress === SOW_GEN_PROGRESS.TCO_GENERATED;
}

/**
 * Check if TCO is ready for submission
 */
export function isReadyForSubmission(sowGenProgress?: string): boolean {
  return sowGenProgress === SOW_GEN_PROGRESS.READY_FOR_SUBMISSION;
}

/**
 * Check if Architecture buttons should be shown (in architecture phase)
 */
export function showArchitectureButtons(sowGenProgress?: string): boolean {
  return (
    sowGenProgress === SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS ||
    sowGenProgress === SOW_GEN_PROGRESS.ARCHITECTURE_GENERATED
  );
}

/**
 * Check if should show cached architecture diagram
 * (ARCHITECTURE_GENERATED or later, but not during generation)
 */
export function shouldShowCachedArchitecture(sowGenProgress?: string): boolean {
  if (!sowGenProgress) return false;
  // Don't show cached during NOT_STARTED, SOW phases, or ARCHITECTURE_IN_PROGRESS
  const excludePhases = [
    SOW_GEN_PROGRESS.NOT_STARTED,
    SOW_GEN_PROGRESS.SOW_IN_PROGRESS,
    SOW_GEN_PROGRESS.SOW_GENERATED,
    SOW_GEN_PROGRESS.ARCHITECTURE_IN_PROGRESS,
  ];
  return !excludePhases.includes(sowGenProgress as any);
}

// =============================================================================
// LABEL HELPER FUNCTIONS
// =============================================================================

/**
 * Get status label for display
 */
export function getStatusLabel(status?: string): string {
  if (!status) return 'Unknown';
  return STATUS_LABELS[status] || status;
}

/**
 * Get phase display label
 */
export function getPhaseDisplayLabel(status?: string): string {
  if (!status) return 'Unknown';
  return PHASE_DISPLAY_LABELS[status] || status;
}

/**
 * Get status badge configuration
 */
export function getStatusBadgeConfig(status?: string): StatusBadgeConfig | null {
  if (!status) return null;
  return STATUS_BADGE_CONFIG[status] || null;
}
