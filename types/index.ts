/**
 * Type Definitions
 * Centralized type definitions for the SOW Generator application
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  preferred_username?: string;
  username?: string;
  groups?: string[];
  [key: string]: unknown;
}

// User roles
export type UserRole = 'Leadership' | 'SA' | 'AE';

export interface CognitoUser {
  id: string;
  email: string;
  username?: string;
  name: string;
  status:
    | 'CONFIRMED'
    | 'FORCE_CHANGE_PASSWORD'
    | 'UNCONFIRMED'
    | 'ARCHIVED'
    | 'COMPROMISED'
    | 'UNKNOWN'
    | 'RESET_REQUIRED'
    | 'EXTERNAL_PROVIDER';
  enabled: boolean;
  groups: string[];
  role: UserRole | null;  // Leadership, SA, AE, or null
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserGroupsRequest {
  groups: string[];
}

// ============================================================================
// HubSpot Data Types
// ============================================================================

export interface Company {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  industry?: string;
  createdate?: string;
  lastmodifieddate?: string;
}

export interface Deal {
  id: string;
  dealname: string;
  description?: string;
  amount?: number | string;
  closedate?: string;
  dealstage?: string;
  dealstage_label?: string;  // Human-readable stage label (e.g., "Technical Validation", "Business Validation", "Committed")
  pipeline?: string;
  createdate?: string;
  lastmodifieddate?: string;
  company_id?: string;
  company?: {
    id: string;
    name: string;
  };
  // Additional fields from HubSpot
  hubspot_owner_id?: string;
  hubspot_owner_name?: string;
  customer_segment?: string;
  opportunity?: string;
  funding_program?: string;
  // Aliases for compatibility
  hs_object_id?: string;
  created_at?: string;
  updated_at?: string;
  // Assignment info from backend
  assignee?: {
    id: string;
    name: string;
    assigned_at?: string;
    assigned_by?: string;
  } | null;
  // Metadata from deals_metadata table
  target_date?: string;
  phase?: string;  // UN_ASSIGNED, SA_ASSIGNED, SOW_IN_PROGRESS, TECHNICAL_REVIEW
}

// ============================================================================
// Document Template Types
// ============================================================================

export interface TemplateVariable {
  name: string;
  type: 'string' | 'bulleted_list' | 'heading_paragraphs' | 'object' | 'currency' | 'date' | 'number';
  description: string;
  schema?: Record<string, string>; // For array of objects, defines the structure
}

export interface DocumentTemplate {
  id?: string;
  name: string;
  description?: string;
  type?: 'KNOWLEDGE_BASE' | 'SOW_TEMPLATE';
  // File information
  filename?: string;
  s3Key?: string;
  fileSize?: number;
  contentType?: string;
  downloadUrl?: string; // Presigned URL for downloading
  // SOW template specific fields
  templateFilename?: string;
  defaultPrompt?: string;
  implementationPrompt?: string;
  architecturePrompt?: string;
  // SMC (Simple Monthly Calculator) prompts - Essential and Growth versions
  essentialPricingPrompt?: string;
  growthPricingPrompt?: string;
  // Legacy field (deprecated, use essentialPricingPrompt/growthPricingPrompt)
  pricingPrompt?: string;
  templateVariables?: TemplateVariable[];
  created_at?: string;
  updated_at?: string;
}

export interface DealTemplate {
  deal_id: string;
  template_id: string;
  assigned_by?: string;
  assigned_at: string;
  additional_instructions?: string;
  capacity_info?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SearchResponse<T> {
  results: T[];
  total: number;
  hasMore?: boolean;
  after?: string;
  paging?: {
    next?: {
      after: string;
    };
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// ============================================================================
// SOW Generation Types
// ============================================================================

export interface SOWGenerationRequest {
  company_id: string;
  deal_id: string;
  template_id?: string;
  facts_pack?: File;
}

export interface GenerateSOWRequest {
  deal_id: string;
  company_id: string;
  template_id?: string;
  additional_instructions?: string;
  capacity_info?: string;
}

export interface SOWGenerationResponse {
  executionArn: string;
  execution_id: string;
  message: string;
  startDate: string;
}

export interface ExecutionStatus {
  executionArn: string;
  execution_id?: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  startDate: string;
  stopDate?: string;
  error?: {
    error: string;
    cause: string;
  };
  output?: string;
}

export interface SOWStatus {
  execution_id: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  progress?: number;
  message?: string;
  error?: string;
}

// ============================================================================
// File Management Types
// ============================================================================

export interface UploadUrlRequest {
  deal_id: string;
  file_name: string;
  content_type: string;
}

export interface UploadUrlResponse {
  upload_url: string;
  file_key: string;
}

export interface DownloadUrlRequest {
  deal_id: string;
  file_name: string;
}

export interface DownloadUrlResponse {
  download_url: string;
}

export interface FileMetadata {
  file_name: string;
  file_key: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

// ============================================================================
// Avoma Meeting Types
// ============================================================================

export interface AvomaMeeting {
  id: string;
  meeting_id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration?: number;
  participants?: string[];
  transcript_available: boolean;
  notes_available: boolean;
  recording_available: boolean;
}

export interface SyncAvomaMeetingsRequest {
  deal_id: string;
  company_id?: string;
}

export interface SyncAvomaMeetingsResponse {
  success: boolean;
  meetings_synced: number;
  message: string;
}

export interface MeetingTranscript {
  meeting_id: string;
  transcript: string;
  segments?: TranscriptSegment[];
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

// Parsed meeting notes types
export interface MeetingNoteItem {
  text: string;
  speaker?: string;
  timestamp?: number | null;
}

export interface MeetingNoteSection {
  id: string;
  title: string;
  icon: string;
  items: MeetingNoteItem[];
  count: number;
  category: string;
}

export interface ParsedMeetingNotesResponse {
  meeting_id: string;
  sections: MeetingNoteSection[];
  meeting: {
    meeting_id: string;
    title: string;
    date: string;
    duration_minutes: number;
  };
}

// Structured transcript response from /transcriptions/{uuid} endpoint
export interface StructuredTranscript {
  transcription_uuid: string;
  meeting_id?: string;
  meeting_title?: string;
  meeting_date?: string;
  total_duration?: number;
  speakers: TranscriptSpeaker[];
  segments: StructuredTranscriptSegment[];
}

export interface TranscriptSpeaker {
  speaker_id: string;
  name: string;
  initials: string;
  email?: string;
}

export interface StructuredTranscriptSegment {
  segment_id: number;
  speaker_id: string;
  speaker_name: string;
  speaker_initials: string;
  start_time: number;
  start_timestamp: string;
  end_time?: number;
  end_timestamp?: string;
  text: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
  | 'DEAL_ASSIGNED'
  | 'DEAL_REASSIGNED'
  | 'SOW_READY_FOR_REVIEW'
  | 'DEAL_STATUS_UPDATED'
  | 'SOW_FLAGGED_FOR_REWORK';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  owner_id: string;
  role: string;
  deal_id: string | null;
  deal_name: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  read_by?: string;
  created_by: string | null;
  created_by_name: string | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  owner_id?: string;
  role?: string;
  deal_id?: string;
  deal_name?: string;
  assignee_name?: string;
}

// ============================================================================
// WebSocket & Real-time Types
// ============================================================================

export interface WebSocketMessage {
  type: 'progress' | 'toast' | 'status' | 'error';
  message: string;
  data?: unknown;
  timestamp?: string;
}

export interface ProgressMessage extends WebSocketMessage {
  type: 'progress';
  data: {
    execution_id: string;
    progress: number;
    step: string;
  };
}

export interface ToastMessage extends WebSocketMessage {
  type: 'toast';
  data: {
    variant: 'success' | 'error' | 'info' | 'warning';
    title?: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

/**
 * Makes specified properties required
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Makes specified properties optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// ============================================================================
// Diagram Generation Types
// ============================================================================

export interface GenerateDiagramRequest {
  s3Key: string;
  customer?: string;
  project?: string;
}

/**
 * Response from POST /diagrams/generate (async trigger)
 * Actual diagram results come via WebSocket events:
 * - diagram_generation_started
 * - diagram_generation_completed (with imageUrl, fileUrl)
 * - diagram_generation_failed
 */
export interface GenerateDiagramResponse {
  message: string;
  executionArn: string;
  startDate: string;
}

/**
 * WebSocket event payload for diagram generation completion
 */
export interface DiagramGenerationCompletedEvent {
  type: 'diagram_generation_completed';
  timestamp: string;
  userId?: string;
  sessionId?: string;
  customer: string;
  project: string;
  architectureS3Key: string;
  imageUrl: string;
  fileUrl: string;
  metadataS3Key: string;
  message: string;
}

/**
 * WebSocket event payload for diagram generation failure
 */
export interface DiagramGenerationFailedEvent {
  type: 'diagram_generation_failed';
  timestamp: string;
  userId?: string;
  sessionId?: string;
  error: string;
  message: string;
}

// ============================================================================
// TCO Pricing Estimate Types
// ============================================================================

export interface GenerateTCORequest {
  s3Key: string;
  sharepointFolderPath?: string; // Optional - TCO can be generated without SharePoint
  // SMC generation parameters (now included in TCO flow)
  dealId?: string;
  customer?: string;
  project?: string;
  templateId?: string;
}

/**
 * Response from POST /pricing-estimate
 * Supports both async (Step Function) and sync (direct cost estimator) responses
 */
export interface GenerateTCOResponse {
  message: string;
  // Async response fields (Step Function)
  executionArn?: string;
  startDate?: string;
  // Sync response fields (direct cost estimator)
  success?: boolean;
  dealId?: string;
  totalMonthlyCost?: number;
  totalAnnualCost?: number;
  servicesCount?: number;
  consoleUrl?: string;
  sharepointUrl?: string;
  totalCost?: number;
}

/**
 * WebSocket event payload for TCO calculation completion
 * This is the actual result payload sent via WebSocket
 */
export interface TCOCalculationCompletedEvent {
  type: 'tco_calculation_completed';
  timestamp: string;
  userId?: string;
  sessionId?: string;
  estimateId: string;
  consoleUrl: string;
  totalCost: number | null;
  currency: string;
  metadataS3Key?: string;
  message?: string;
}

/**
 * WebSocket event payload for TCO calculation failure
 */
export interface TCOCalculationFailedEvent {
  type: 'tco_calculation_failed';
  timestamp: string;
  userId?: string;
  sessionId?: string;
  error: string;
}

/**
 * WebSocket event payload for TCO generation failure
 */
export interface TCOGenerationFailedEvent {
  type: 'tco_generation_failed';
  timestamp: string;
  userId?: string;
  sessionId?: string;
  error: string;
  message: string;
}

// ============================================================================
// Chat API Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatCitationReference {
  content?: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatCitation {
  text?: string;
  references?: ChatCitationReference[];
}

export interface ChatResponse {
  answer: string;
  sessionId?: string;
  citations?: ChatCitation[];
}
