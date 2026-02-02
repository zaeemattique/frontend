/**
 * RTK Query API Service
 *
 * Comprehensive API service using RTK Query for all backend communication.
 * Replaces Axios with built-in caching, request deduplication, and optimistic updates.
 *
 * Best Practices Implemented:
 * - Tag-based cache invalidation
 * - Automatic token refresh on 401
 * - Request deduplication
 * - TypeScript type safety
 * - Normalized cache updates
 * - Optimistic UI updates for mutations
 */

import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { getIdToken, refreshIdToken, signOut } from '@/lib/auth';
import type {
  Company,
  Deal,
  DocumentTemplate,
  DealTemplate,
  SearchResponse,
  SOWGenerationResponse,
  ExecutionStatus,
  CognitoUser,
  CreateUserRequest,
  GenerateSOWRequest,
  GenerateDiagramRequest,
  GenerateDiagramResponse,
  GenerateTCORequest,
  GenerateTCOResponse,
  StructuredTranscript,
  ParsedMeetingNotesResponse,
  ChatRequest,
  ChatResponse,
  Notification,
  NotificationsResponse,
  UnreadCountResponse,
  CreateNotificationRequest,
} from '@/types';

// ============================================================================
// Base Query with Authentication
// ============================================================================

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
  prepareHeaders: async (headers) => {
    // Get ID token from auth service (matches original frontend)
    const token = await getIdToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log(`[API] Request with ID token`);
    } else {
      console.warn(`[API] No ID token available`);
    }
    return headers;
  },
});

/**
 * Base query with automatic token refresh on 401
 * Implements retry logic and redirects to login on auth failure
 */
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 Unauthorized
  if (result.error && result.error.status === 401) {
    console.error('[API] 401 Unauthorized, attempting token refresh');

    try {
      // Try to refresh the ID token (matches original frontend)
      const newToken = await refreshIdToken();

      if (newToken) {
        console.log('[API] Token refreshed successfully, retrying request');
        // Retry the original query with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, sign out and redirect
        console.error('[API] Token refresh failed, signing out');
        await signOut();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('[API] Error during token refresh:', error);
      await signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  return result;
};

// Retry logic for failed requests (network errors, timeouts)
const baseQueryWithRetry = retry(baseQueryWithReauth, { maxRetries: 1 });

// ============================================================================
// API Service Definition
// ============================================================================

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,

  // Tag types for cache invalidation
  tagTypes: [
    'Company',
    'Deal',
    'Template',
    'DealTemplate',
    'User',
    'Meeting',
    'File',
    'GeneratedContent',
    'Notification',
  ],

  endpoints: (builder) => ({
    // ========================================================================
    // Companies Endpoints
    // ========================================================================

    getCompanies: builder.query<
      SearchResponse<Company>,
      { limit?: number; after?: string }
    >({
      query: ({ limit = 20, after }) => ({
        url: '/companies',
        params: { limit, after },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({ type: 'Company' as const, id })),
              { type: 'Company', id: 'LIST' },
            ]
          : [{ type: 'Company', id: 'LIST' }],
    }),

    searchCompanies: builder.query<
      SearchResponse<Company>,
      { query: string; limit?: number }
    >({
      query: ({ query, limit = 20 }) => ({
        url: '/companies',
        params: { q: query, limit },
      }),
      providesTags: [{ type: 'Company', id: 'SEARCH' }],
    }),

    getCompany: builder.query<Company, string>({
      query: (id) => `/companies/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Company', id }],
    }),

    // ========================================================================
    // Deals Endpoints
    // ========================================================================

    getDeals: builder.query<
      SearchResponse<Deal>,
      {
        limit?: number;
        after?: string;
        q?: string;
        status?: string; // Deal stage filter (technical_validation, etc.)
        phaseStatus?: string[]; // Status filter (SOW workflow status)
        ownerIds?: string[];
        assigneeIds?: string[];
        unassignedOnly?: boolean;
        targetDateStart?: string;
        targetDateEnd?: string;
      }
    >({
      query: ({ limit = 20, after, q, status, phaseStatus, ownerIds, assigneeIds, unassignedOnly, targetDateStart, targetDateEnd }) => ({
        url: '/deals',
        params: {
          limit,
          after,
          q,
          status,
          phase_status: phaseStatus?.length ? phaseStatus.join(',') : undefined,
          owner_ids: ownerIds?.length ? ownerIds.join(',') : undefined,
          assignee_ids: assigneeIds?.length ? assigneeIds.join(',') : undefined,
          unassigned_only: unassignedOnly ? 'true' : undefined,
          target_date_start: targetDateStart,
          target_date_end: targetDateEnd,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({ type: 'Deal' as const, id })),
              { type: 'Deal', id: 'LIST' },
            ]
          : [{ type: 'Deal', id: 'LIST' }],
    }),

    searchDeals: builder.query<
      SearchResponse<Deal>,
      { query: string; limit?: number; company_id?: string }
    >({
      query: ({ query, limit = 20, company_id }) => ({
        url: '/deals',
        params: { q: query, limit, company_id },
      }),
      providesTags: [{ type: 'Deal', id: 'SEARCH' }],
    }),

    getDeal: builder.query<Deal, string>({
      query: (id) => `/deals/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Deal', id }],
    }),

    getDealOwners: builder.query<
      { owners: { id: string; name: string; email: string }[] },
      void
    >({
      query: () => '/deals/owners',
    }),

    // Get all deal assignments
    getDealAssignments: builder.query<
      { assignments: Record<string, { assignee_id: string; assignee_name: string; assigned_at: string; assigned_by: string }> },
      void
    >({
      query: () => '/deals/assignments',
      providesTags: [{ type: 'Deal', id: 'ASSIGNMENTS' }],
    }),

    // Assign a deal to a user
    assignDeal: builder.mutation<
      { message: string; assignment: { deal_id: string; assignee_id: string; assignee_name: string; assigned_at: string } },
      { dealId: string; assigneeId: string; assigneeName: string; dealName?: string }
    >({
      query: ({ dealId, assigneeId, assigneeName, dealName }) => ({
        url: `/deals/${dealId}/assignment`,
        method: 'PUT',
        body: { assignee_id: assigneeId, assignee_name: assigneeName, deal_name: dealName },
      }),
      invalidatesTags: [{ type: 'Deal', id: 'ASSIGNMENTS' }],
    }),

    // Unassign a deal
    unassignDeal: builder.mutation<
      { message: string },
      string
    >({
      query: (dealId) => ({
        url: `/deals/${dealId}/assignment`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Deal', id: 'ASSIGNMENTS' }],
    }),

    // ========================================================================
    // SOW Generation Endpoints
    // ========================================================================

    generateSOW: builder.mutation<SOWGenerationResponse, GenerateSOWRequest>({
      query: (request) => ({
        url: '/generate-sow',
        method: 'POST',
        body: {
          companyId: request.company_id,
          dealId: request.deal_id,
          templateId: request.template_id,
        },
      }),
      invalidatesTags: (_result, _error, { deal_id }) => [
        { type: 'Deal', id: deal_id },
        { type: 'GeneratedContent', id: deal_id },
      ],
    }),

    getSOWStatus: builder.query<SOWGenerationResponse, string>({
      query: (executionArn) => ({
        url: '/sow-status',
        params: { execution_arn: executionArn },
      }),
    }),

    getExecutionStatus: builder.query<ExecutionStatus, string>({
      query: (executionArn) => {
        const encodedArn = encodeURIComponent(executionArn);
        return `/execution-status/${encodedArn}`;
      },
    }),

    // ========================================================================
    // Files Endpoints
    // ========================================================================

    getFiles: builder.query<
      {
        files: unknown[];
        main_files: unknown[];
        generated_files: unknown[];
        count: number;
        sharepoint_folder_url?: string | null;
        latestArchitectureDiagram?: {
          imageUrl: string;
          fileUrl: string;
          generatedAt: string;
        } | null;
        latestTCOEstimate?: {
          totalCost: number | null;
          currency: string;
          generatedAt: string;
        } | null;
      },
      { company_id: string; deal_id: string; includeLatestArchitectureDiagram?: boolean; includeLatestTCOEstimate?: boolean }
    >({
      query: ({ company_id, deal_id, includeLatestArchitectureDiagram, includeLatestTCOEstimate }) => {
        const params: Record<string, string> = {};
        if (includeLatestArchitectureDiagram) {
          params.includeLatestArchitectureDiagram = 'true';
        }
        if (includeLatestTCOEstimate) {
          params.includeLatestTCOEstimate = 'true';
        }
        return {
          url: `/files/${company_id}/${deal_id}`,
          params,
        };
      },
      providesTags: (_result, _error, { deal_id }) => [
        { type: 'File', id: deal_id },
      ],
    }),

    getFileDownloadUrl: builder.query<
      { download_url: string; expires_in: number },
      {
        company_id: string;
        deal_id: string;
        filename: string;
        fileType?: 'main' | 'generated';
      }
    >({
      query: ({ company_id, deal_id, filename, fileType }) => ({
        url: `/files/${company_id}/${deal_id}/${encodeURIComponent(filename)}`,
        params: fileType ? { type: fileType } : {},
      }),
    }),

    getFileUploadUrl: builder.mutation<
      { upload_url: string; key: string; expires_in: number },
      {
        company_id: string;
        deal_id: string;
        filename: string;
        content_type?: string;
      }
    >({
      query: ({ company_id, deal_id, filename, content_type }) => {
        // Normalize empty content_type to application/octet-stream
        const normalizedContentType =
          content_type && content_type.trim() !== ''
            ? content_type
            : 'application/octet-stream';

        return {
          url: `/files/${company_id}/${deal_id}/${encodeURIComponent(filename)}`,
          method: 'POST',
          params: { content_type: normalizedContentType },
        };
      },
    }),

    deleteFile: builder.mutation<
      { success: boolean; message: string },
      { company_id: string; deal_id: string; filename: string }
    >({
      query: ({ company_id, deal_id, filename }) => ({
        url: `/files/${company_id}/${deal_id}/${encodeURIComponent(filename)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { deal_id }) => [
        { type: 'File', id: deal_id },
        { type: 'Deal', id: deal_id },
      ],
    }),

    // ========================================================================
    // Document Templates Endpoints (supports both KNOWLEDGE_BASE and SOW_TEMPLATE types)
    // ========================================================================

    getDocumentTemplates: builder.query<DocumentTemplate[], { type?: 'KNOWLEDGE_BASE' | 'SOW_TEMPLATE'; search?: string } | void>({
      query: (params) => {
        const queryParts: string[] = [];
        if (params?.type) queryParts.push(`type=${params.type}`);
        if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
        const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
        return `/document-templates${queryString}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Template' as const, id })),
              { type: 'Template', id: 'LIST' },
            ]
          : [{ type: 'Template', id: 'LIST' }],
    }),

    getDocumentTemplate: builder.query<DocumentTemplate, string>({
      query: (id) => `/document-templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Template', id }],
    }),

    createDocumentTemplate: builder.mutation<DocumentTemplate, Partial<DocumentTemplate>>({
      query: (template) => ({
        url: '/document-templates',
        method: 'POST',
        body: template,
      }),
      invalidatesTags: [{ type: 'Template', id: 'LIST' }],
    }),

    updateDocumentTemplate: builder.mutation<
      DocumentTemplate,
      { id: string; template: Partial<DocumentTemplate> }
    >({
      query: ({ id, template }) => {
        console.log('[API] updateDocumentTemplate - id:', id, 'body:', template);
        return {
          url: `/document-templates/${id}`,
          method: 'PUT',
          body: template,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Template', id },
        { type: 'Template', id: 'LIST' },
      ],
    }),

    deleteDocumentTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/document-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Template', id },
        { type: 'Template', id: 'LIST' },
      ],
    }),

    // Get presigned upload URL for document template file
    getDocumentUploadUrl: builder.mutation<
      { uploadUrl: string; s3Key: string; expiresIn: number },
      { id: string; filename: string; contentType?: string }
    >({
      query: ({ id, filename, contentType }) => ({
        url: `/document-templates/${id}/upload-url`,
        method: 'POST',
        body: { filename, contentType: contentType || 'application/octet-stream' },
      }),
    }),

    // ========================================================================
    // Deal Templates Endpoints
    // ========================================================================

    getDealTemplate: builder.query<DealTemplate, string>({
      query: (dealId) => `/deals/${dealId}/template`,
      providesTags: (_result, _error, dealId) => [
        { type: 'DealTemplate', id: dealId },
      ],
    }),

    assignDealTemplate: builder.mutation<
      DealTemplate,
      {
        dealId: string;
        templateId: string;
        additionalInstructions?: string;
        capacityInfo?: string;
      }
    >({
      query: ({ dealId, templateId, additionalInstructions, capacityInfo }) => ({
        url: `/deals/${dealId}/template`,
        method: 'PUT',
        body: {
          template_id: templateId,
          additional_instructions: additionalInstructions,
          capacity_info: capacityInfo,
        },
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'DealTemplate', id: dealId },
        { type: 'Deal', id: dealId },
      ],
    }),

    removeDealTemplate: builder.mutation<void, string>({
      query: (dealId) => ({
        url: `/deals/${dealId}/template`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, dealId) => [
        { type: 'DealTemplate', id: dealId },
        { type: 'Deal', id: dealId },
      ],
    }),

    // ========================================================================
    // Avoma Meetings Endpoints
    // ========================================================================

    syncAvomaMeetings: builder.mutation<
      { synced_meetings: number; failed_meetings: number; total_meetings: number },
      { dealId: string; companyId: string }
    >({
      query: ({ dealId, companyId }) => ({
        url: `/deals/${dealId}/sync-avoma-meetings`,
        method: 'POST',
        body: { company_id: companyId },
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'Meeting', id: dealId },
        { type: 'Deal', id: dealId },
      ],
    }),

    getAvomaMeetings: builder.query<
      {
        meetings: unknown[];
        total: number;
        selected_count: number;
        selection: unknown;
      },
      { dealId: string; companyId: string }
    >({
      query: ({ dealId, companyId }) => ({
        url: `/deals/${dealId}/avoma-meetings`,
        params: { company_id: companyId },
      }),
      providesTags: (_result, _error, { dealId }) => [
        { type: 'Meeting', id: dealId },
      ],
    }),

    getMeetingSelection: builder.query<
      {
        selected_meetings: string[];
        last_updated: string;
        updated_by: string;
      },
      { dealId: string; companyId: string }
    >({
      query: ({ dealId, companyId }) => ({
        url: `/deals/${dealId}/avoma-meetings/selected`,
        params: { company_id: companyId },
      }),
      providesTags: (_result, _error, { dealId }) => [
        { type: 'Meeting', id: `${dealId}-selection` },
      ],
    }),

    updateMeetingSelection: builder.mutation<
      { message: string; selection: unknown },
      { dealId: string; companyId: string; selectedMeetingIds: string[] }
    >({
      query: ({ dealId, companyId, selectedMeetingIds }) => ({
        url: `/deals/${dealId}/avoma-meetings/selection`,
        method: 'PUT',
        body: {
          company_id: companyId,
          selected_meeting_ids: selectedMeetingIds,
        },
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'Meeting', id: `${dealId}-selection` },
        { type: 'Meeting', id: dealId },
      ],
    }),

    getMeetingDetails: builder.query<
      {
        metadata: unknown;
        notes: unknown;
        transcript_preview: string;
        has_full_transcript: boolean;
      },
      { dealId: string; companyId: string; meetingId: string }
    >({
      query: ({ dealId, companyId, meetingId }) => ({
        url: `/deals/${dealId}/avoma-meetings/${meetingId}`,
        params: { company_id: companyId },
      }),
    }),

    getMeetingTranscript: builder.query<
      {
        content: string;
        content_type: string;
        size: number;
        last_modified: string;
        meeting: unknown;
      },
      { dealId: string; companyId: string; meetingId: string }
    >({
      query: ({ dealId, companyId, meetingId }) => ({
        url: `/deals/${dealId}/avoma-meetings/${meetingId}/transcript`,
        params: { company_id: companyId },
      }),
    }),

    getMeetingNotes: builder.query<
      {
        content: string;
        content_type: string;
        size: number;
        last_modified: string;
        meeting: unknown;
      },
      { dealId: string; companyId: string; meetingId: string }
    >({
      query: ({ dealId, companyId, meetingId }) => ({
        url: `/deals/${dealId}/avoma-meetings/${meetingId}/notes`,
        params: { company_id: companyId },
      }),
    }),

    // Get structured transcript by transcription UUID
    getStructuredTranscript: builder.query<StructuredTranscript, string>({
      query: (uuid) => `/transcriptions/${uuid}`,
    }),

    // Get parsed meeting notes as categorized sections
    getParsedMeetingNotes: builder.query<
      ParsedMeetingNotesResponse,
      { dealId: string; companyId: string; meetingId: string }
    >({
      query: ({ dealId, companyId, meetingId }) => ({
        url: `/deals/${dealId}/avoma-meetings/${meetingId}/parsed-notes`,
        params: { company_id: companyId },
      }),
    }),

    // ========================================================================
    // Generated Files Content Endpoints
    // ========================================================================

    getSowContent: builder.query<
      {
        content: string;
        content_type: string;
        size: number;
        last_modified: string;
        filename: string;
        file_key: string;
      },
      { dealId: string; companyId: string }
    >({
      query: ({ dealId, companyId }) =>
        `/files/${companyId}/${dealId}/sow/content`,
      providesTags: (_result, _error, { dealId }) => [
        { type: 'GeneratedContent', id: `${dealId}-sow` },
      ],
    }),

    getArchitectureContent: builder.query<
      {
        content: string;
        content_type: string;
        size: number;
        last_modified: string;
        filename: string;
        file_key: string;
      },
      { dealId: string; companyId: string }
    >({
      query: ({ dealId, companyId }) =>
        `/files/${companyId}/${dealId}/architecture/content`,
      providesTags: (_result, _error, { dealId }) => [
        { type: 'GeneratedContent', id: `${dealId}-architecture` },
      ],
    }),

    getPricingCalculatorContent: builder.query<
      {
        content: string;
        content_type: string;
        size: number;
        last_modified: string;
        filename: string;
        file_key: string;
      },
      { dealId: string; companyId: string }
    >({
      query: ({ dealId, companyId }) =>
        `/files/${companyId}/${dealId}/pricing/content`,
      providesTags: (_result, _error, { dealId }) => [
        { type: 'GeneratedContent', id: `${dealId}-pricing` },
      ],
    }),

    // ========================================================================
    // Users Endpoints (Cognito User Management)
    // ========================================================================

    getUsers: builder.query<CognitoUser[], { roles?: string[]; enabled?: boolean } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params && params.roles && params.roles.length > 0) {
          // Pass roles as comma-separated string
          queryParams.set('roles', params.roles.join(','));
        }
        if (params && params.enabled !== undefined) {
          queryParams.set('enabled', String(params.enabled));
        }
        const queryString = queryParams.toString();
        return `/users${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUser: builder.query<CognitoUser, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    createUser: builder.mutation<CognitoUser, CreateUserRequest>({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    updateUserGroups: builder.mutation<
      CognitoUser,
      { id: string; groups: string[] }
    >({
      query: ({ id, groups }) => ({
        url: `/users/${id}/groups`,
        method: 'PUT',
        body: { groups },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    deactivateUser: builder.mutation<CognitoUser, string>({
      query: (id) => ({
        url: `/users/${id}/deactivate`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    activateUser: builder.mutation<CognitoUser, string>({
      query: (id) => ({
        url: `/users/${id}/activate`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // ========================================================================
    // SharePoint Upload Endpoints
    // ========================================================================

    uploadToSharePoint: builder.mutation<
      {
        success: boolean;
        message: string;
        folder_path: string;
        folder_url: string;
        files: Array<{
          filename: string;
          type: string;
          status: 'success' | 'failed';
          error?: string;
        }>;
      },
      {
        company_id: string;
        deal_id: string;
        deal_name: string;
        folder_path?: string;
      }
    >({
      query: ({ company_id, deal_id, deal_name, folder_path }) => ({
        url: '/sharepoint/upload',
        method: 'POST',
        body: {
          company_id,
          deal_id,
          deal_name,
          folder_path,
        },
      }),
    }),

    // ========================================================================
    // Diagram Generation Endpoints (Async via Step Function)
    // ========================================================================

    /**
     * Trigger diagram generation asynchronously via Step Function.
     * Returns executionArn immediately - results come via WebSocket.
     */
    generateDiagram: builder.mutation<GenerateDiagramResponse, GenerateDiagramRequest>({
      query: ({ s3Key, customer, project }) => ({
        url: '/diagrams/generate',
        method: 'POST',
        body: {
          s3Key,
          customer,
          project,
        },
      }),
    }),

    /**
     * Save architecture diagram to SharePoint deal folder.
     * Downloads the PNG from imageUrl and uploads to the customer's SharePoint folder.
     */
    saveDiagramToSharePoint: builder.mutation<
      {
        success: boolean;
        message: string;
        filename: string;
        webUrl: string;
        folderPath: string;
      },
      {
        companyId: string;
        dealId: string;
        customerName: string;
        imageUrl: string;
        filename?: string;
        skipStatusUpdate?: boolean;
      }
    >({
      query: ({ companyId, dealId, customerName, imageUrl, filename, skipStatusUpdate }) => ({
        url: '/diagrams/save-to-sharepoint',
        method: 'POST',
        body: {
          companyId,
          dealId,
          customerName,
          imageUrl,
          filename,
          skipStatusUpdate,
        },
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'File', id: dealId },
        { type: 'Deal', id: dealId },
      ],
    }),

    // ========================================================================
    // TCO Pricing Estimate Endpoints
    // ========================================================================

    /**
     * Generate AWS TCO pricing estimate from pricing markdown file.
     * Calls the MCP pricing server to generate cost estimates.
     */
    generateTCO: builder.mutation<GenerateTCOResponse, GenerateTCORequest>({
      queryFn: async ({ s3Key, sharepointFolderPath, dealId, customer, project, templateId }) => {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token = await getIdToken();

        const response = await fetch(`${baseUrl}/pricing-estimate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            s3Key,
            sharepointFolderPath,
            // SMC generation parameters (now included in TCO flow)
            dealId,
            customer,
            project,
            templateId,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Request failed' }));
          return { error: { status: response.status, data: error } };
        }

        const data = await response.json();
        return { data };
      },
    }),

    // ========================================================================
    // Chat API Endpoints
    // ========================================================================

    /**
     * Send a message to the Knowledge Base RAG chat.
     * Uses Bedrock RetrieveAndGenerate API for context-aware responses.
     */
    sendChatMessage: builder.mutation<ChatResponse, ChatRequest>({
      query: ({ message, sessionId }) => ({
        url: '/chat',
        method: 'POST',
        body: {
          message,
          ...(sessionId && { sessionId }),
        },
      }),
    }),

    // ========================================================================
    // Notifications Endpoints
    // ========================================================================

    /**
     * Get notifications for the current user
     * Returns notifications targeted to the user or their role
     * Supports server-side filtering by search, type, and date
     */
    getNotifications: builder.query<NotificationsResponse, {
      limit?: number;
      unreadOnly?: boolean;
      search?: string;
      type?: string;
      dateFilter?: string;
    } | void>({
      query: (params) => ({
        url: '/notifications',
        params: {
          limit: params?.limit || 20,
          unread_only: params?.unreadOnly ? 'true' : undefined,
          search: params?.search || undefined,
          type: params?.type || undefined,
          date_filter: params?.dateFilter || undefined,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.notifications.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    /**
     * Get unread notification count for the current user
     */
    getUnreadCount: builder.query<UnreadCountResponse, void>({
      query: () => '/notifications/unread-count',
      providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
    }),

    /**
     * Mark a single notification as read
     * Note: No invalidatesTags - we use optimistic UI updates in the components
     */
    markNotificationAsRead: builder.mutation<{ message: string }, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'PUT',
      }),
      // Don't invalidate tags - optimistic updates handle UI state
    }),

    /**
     * Mark all notifications as read for the current user
     * Note: No invalidatesTags - we use optimistic UI updates in the components
     */
    markAllNotificationsAsRead: builder.mutation<{ message: string; updated: number }, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'PUT',
      }),
      // Don't invalidate tags - optimistic updates handle UI state
    }),

    /**
     * Create a notification (used for submitting SOW for review)
     */
    createNotification: builder.mutation<Notification, CreateNotificationRequest>({
      query: (notification) => ({
        url: '/notifications',
        method: 'POST',
        body: notification,
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    /**
     * Mark visible notifications as viewed (called when dropdown opens)
     * This adds the current user to the viewed_by array for each notification
     * Note: No invalidatesTags - we use optimistic UI updates in the components
     */
    markVisibleNotificationsAsViewed: builder.mutation<{ message: string; updated: number }, string[]>({
      query: (notificationIds) => ({
        url: '/notifications/mark-visible-read',
        method: 'POST',
        body: { notification_ids: notificationIds },
      }),
      // Don't invalidate tags - optimistic updates handle UI state
    }),

    // ========================================================================
    // Deal Metadata Endpoints
    // ========================================================================

    /**
     * Update deal phase/status
     * Used when submitting SOW for review (TECHNICAL_REVIEW)
     */
    updateDealPhase: builder.mutation<{ message: string }, { dealId: string; status: string }>({
      query: ({ dealId, status }) => ({
        url: `/deals-metadata/${dealId}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'Deal', id: dealId },
        { type: 'Deal', id: 'LIST' },
      ],
    }),

    /**
     * Update SOW generation progress
     * Tracks the workflow: SOW_IN_PROGRESS -> SOW_COMPLETED -> ARCHITECTURE_IN_PROGRESS -> TCO_IN_PROGRESS -> TCO_COMPLETED
     */
    updateSowGenProgress: builder.mutation<any, { dealId: string; progress: string }>({
      query: ({ dealId, progress }) => ({
        url: `/deals-metadata/${dealId}/sow-gen-progress`,
        method: 'PUT',
        body: { progress },
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'Deal', id: dealId },
        { type: 'Deal', id: 'LIST' },
        { type: 'File', id: dealId },
      ],
    }),

    /**
     * Finalize SOW document in SharePoint
     * Deletes all SOW_Version_*.docx except latest, renames latest to SOW_FINAL_{N}.docx
     * Also updates sow_gen_progress to ARCHITECTURE_IN_PROGRESS
     */
    finalizeSow: builder.mutation<
      {
        success: boolean;
        finalized: boolean;
        deletedVersions: string[];
        finalFileName: string;
        finalFileUrl: string;
        progress: string;
      },
      { companyId: string; dealId: string }
    >({
      query: ({ companyId, dealId }) => ({
        url: `/files/${companyId}/${dealId}/finalize-sow`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'Deal', id: dealId },
        { type: 'Deal', id: 'LIST' },
        { type: 'File', id: dealId },
      ],
    }),

    /**
     * Finalize Architecture Diagram in SharePoint
     * Deletes all Architecture_Diagram_Version_*.png except latest, renames latest to Architecture_Diagram_FINAL_{N}.png
     * Also updates sow_gen_progress to TCO_IN_PROGRESS
     */
    finalizeArchitecture: builder.mutation<
      {
        message: string;
        finalized: boolean;
        deletedVersions: string[];
        finalFileName: string | null;
        finalFileUrl: string | null;
        previousVersionCount?: number;
      },
      { companyId: string; dealId: string }
    >({
      query: ({ companyId, dealId }) => ({
        url: `/files/${companyId}/${dealId}/finalize-architecture`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'Deal', id: dealId },
        { type: 'Deal', id: 'LIST' },
        { type: 'File', id: dealId },
      ],
    }),

    /**
     * Finalize TCO/SMC files in SharePoint
     * Deletes all SMC_Essential_Version_*.md and SMC_Growth_Version_*.md except latest of each
     * Renames latest to SMC_Essential_FINAL_{N}.md and SMC_Growth_FINAL_{N}.md
     * Also updates sow_gen_progress to TCO_COMPLETED
     */
    finalizeTCO: builder.mutation<
      {
        message: string;
        finalized: boolean;
        essential: {
          finalFileName: string;
          finalFileUrl: string;
          deletedVersions: string[];
        } | null;
        growth: {
          finalFileName: string;
          finalFileUrl: string;
          deletedVersions: string[];
        } | null;
      },
      { companyId: string; dealId: string }
    >({
      query: ({ companyId, dealId }) => ({
        url: `/files/${companyId}/${dealId}/finalize-tco`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { dealId }) => [
        { type: 'Deal', id: dealId },
        { type: 'Deal', id: 'LIST' },
        { type: 'File', id: dealId },
      ],
    }),

    /**
     * Get deal metadata including sow_gen_progress
     */
    getDealMetadata: builder.query<any, string>({
      query: (dealId) => `/deals-metadata/${dealId}`,
      providesTags: (_result, _error, dealId) => [
        { type: 'Deal', id: dealId },
      ],
    }),
  }),
});

// ============================================================================
// Export Hooks
// ============================================================================

export const {
  // Companies
  useGetCompaniesQuery,
  useSearchCompaniesQuery,
  useGetCompanyQuery,

  // Deals
  useGetDealsQuery,
  useLazyGetDealsQuery,
  useSearchDealsQuery,
  useGetDealQuery,
  useGetDealOwnersQuery,
  useGetDealAssignmentsQuery,
  useAssignDealMutation,
  useUnassignDealMutation,

  // SOW Generation
  useGenerateSOWMutation,
  useGetSOWStatusQuery,
  useGetExecutionStatusQuery,

  // Files
  useGetFilesQuery,
  useGetFileDownloadUrlQuery,
  useGetFileUploadUrlMutation,
  useDeleteFileMutation,

  // Document Templates
  useGetDocumentTemplatesQuery,
  useGetDocumentTemplateQuery,
  useCreateDocumentTemplateMutation,
  useUpdateDocumentTemplateMutation,
  useDeleteDocumentTemplateMutation,
  useGetDocumentUploadUrlMutation,

  // Deal Templates
  useGetDealTemplateQuery,
  useAssignDealTemplateMutation,
  useRemoveDealTemplateMutation,

  // Avoma Meetings
  useSyncAvomaMeetingsMutation,
  useGetAvomaMeetingsQuery,
  useGetMeetingSelectionQuery,
  useUpdateMeetingSelectionMutation,
  useGetMeetingDetailsQuery,
  useGetMeetingTranscriptQuery,
  useGetMeetingNotesQuery,
  useGetStructuredTranscriptQuery,
  useGetParsedMeetingNotesQuery,

  // Generated Content
  useGetSowContentQuery,
  useGetArchitectureContentQuery,
  useGetPricingCalculatorContentQuery,

  // Users
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserGroupsMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,

  // SharePoint
  useUploadToSharePointMutation,

  // Diagram Generation
  useGenerateDiagramMutation,
  useSaveDiagramToSharePointMutation,

  // TCO Pricing Estimate
  useGenerateTCOMutation,

  // Chat
  useSendChatMessageMutation,

  // Notifications
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useCreateNotificationMutation,
  useMarkVisibleNotificationsAsViewedMutation,

  // Deal Metadata
  useUpdateDealPhaseMutation,
  useUpdateSowGenProgressMutation,
  useGetDealMetadataQuery,
  useFinalizeSowMutation,
  useFinalizeArchitectureMutation,
  useFinalizeTCOMutation,
} = api;

// Export resetApiState action for clearing cache on logout
export const { resetApiState } = api.util;
