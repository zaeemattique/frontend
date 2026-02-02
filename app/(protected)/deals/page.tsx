/**
 * Deals List Page
 *
 * Shows all deals in a scrollable table format
 * New design: Deal Title, Deal Owner, Opportunity Type, Target Date, Budget, Assignee, Phase
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import { useGetDealsQuery, useLazyGetDealsQuery, useGetDealOwnersQuery, useGetUsersQuery, useAssignDealMutation, useUnassignDealMutation } from '@/store/services/api';
import { AssigneeDropdown } from '@/components/ui/AssigneeDropdown';
import { SearchableMultiSelectFilter, TargetDateFilter, getTargetDateRange, type TargetDateOption } from '@/components/ui/FilterDropdown';
import { TableSkeleton } from '@/components/ui/Loader';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { useDealsSearch } from '@/contexts/DealsSearchContext';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import {
  PHASE_DISPLAY_LABELS,
  STATUS_FILTER_OPTIONS,
  DEAL_STAGE_FILTER_OPTIONS,
  SOW_SUBMISSION_PENDING_FILTER,
  PRE_SUBMISSION_STAGES,
  getStatusBadgeConfig,
  type StatusBadgeConfig,
} from '@/utils/dealStatus';
import type { Deal } from '@/types';

// Filter state interface
interface DealFilters {
  status: string[];
  dealStage: string[];
  targetDate: TargetDateOption;
  createdBy: string[];
  assignee: string[];
}

// Assignee user type for the dropdown
interface AssigneeUser {
  id: string;
  name: string;
  initials: string;
  color: string;
}

// Colors for user avatars (rotate through these)
const AVATAR_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
];

// Generate initials from name
function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1 && parts[0]) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] || '?';
  const last = parts[parts.length - 1]?.[0] || '?';
  return (first + last).toUpperCase();
}

// Get a consistent color for a user based on their ID
function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return color ?? '#6366F1';
}

// Get status badge classes based on variant
const getStatusBadgeClasses = (variant: StatusBadgeConfig['variant']): string => {
  switch (variant) {
    case 'blue':
      return 'bg-blue-100 text-blue-700';
    case 'green':
      return 'bg-green-100 text-green-700';
    case 'orange':
      return 'bg-orange-100 text-orange-700';
    case 'gray':
    default:
      return '';
  }
};

const PAGE_SIZE = 50;

// Special value for unassigned filter option
const UNASSIGNED_FILTER_VALUE = '__UNASSIGNED__';

// Sort configuration type
type SortField = 'target_date' | 'amount' | 'assignee' | null;
type SortDirection = 'asc' | 'desc';

export default function DealsPage() {
  const router = useRouter();
  const { canAssignDeals, isLeadership, isSA } = usePermissions();

  // Get search query from context (shared with header)
  const { searchQuery, setSearchQuery } = useDealsSearch();
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Clear search query when leaving the Deals page
  useEffect(() => {
    return () => {
      setSearchQuery('');
    };
  }, [setSearchQuery]);

  // Pagination state
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMoreDeals, setHasMoreDeals] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter state
  const [filters, setFilters] = useState<DealFilters>({
    status: [],
    dealStage: [],
    targetDate: null,
    createdBy: [],
    assignee: [],
  });

  // State to track optimistic assignee updates
  const [optimisticAssignees, setOptimisticAssignees] = useState<Record<string, AssigneeUser | null>>({});

  // Fetch all deal owners from HubSpot
  const { data: ownersData } = useGetDealOwnersQuery();

  // Fetch all active users for assignee dropdown
  const { data: usersData } = useGetUsersQuery({ enabled: true });

  // Mutations for assigning/unassigning deals
  const [assignDeal] = useAssignDealMutation();
  const [unassignDeal] = useUnassignDealMutation();

  // Lazy query for loading more deals
  const [fetchMoreDeals] = useLazyGetDealsQuery();

  // Transform users to assignee format - Leadership and SA roles can be assigned
  const assigneeUsers: AssigneeUser[] = useMemo(() => {
    if (!usersData) return [];
    const users = Array.isArray(usersData) ? usersData : [];
    return users
      .filter((user) => (user.name || user.email) && (user.role === 'Leadership' || user.role === 'SA'))
      .map((user) => ({
        id: user.id,
        name: user.name || user.email || 'Unknown User',
        initials: getInitials(user.name || user.email || ''),
        color: getAvatarColor(user.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usersData]);

  // Build assignee filter options including "Unassigned" option
  const assigneeFilterOptions = useMemo(() => {
    const userOptions = assigneeUsers.map((u) => ({ value: u.id, label: u.name }));
    // Add "Unassigned" as the first option
    return [{ value: UNASSIGNED_FILTER_VALUE, label: 'Unassigned' }, ...userOptions];
  }, [assigneeUsers]);

  // Build owner options from fetched owners
  const ownerOptions = useMemo(() => {
    if (!ownersData?.owners) return [];
    return ownersData.owners
      .filter((owner) => owner.name)
      .map((owner) => ({
        value: owner.id,
        label: owner.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [ownersData]);

  useEffect(() => {
    document.title = 'Deals - SOW Generator';
    return () => {
      document.title = 'SOW Generator';
    };
  }, []);

  // Helper function to get assignee for a deal (optimistic state takes priority)
  const getAssigneeForDeal = (deal: Deal): AssigneeUser | null => {
    if (deal.id in optimisticAssignees) {
      return optimisticAssignees[deal.id] ?? null;
    }
    if (deal.assignee) {
      return {
        id: deal.assignee.id,
        name: deal.assignee.name,
        initials: getInitials(deal.assignee.name),
        color: getAvatarColor(deal.assignee.id),
      };
    }
    return null;
  };

  // Check if user is typing a partial search query (1 char) - skip query in this case
  const hasPartialSearchQuery = searchQuery.length > 0 && searchQuery.length < 2;

  // Check if search query is valid (2+ chars)
  const hasValidSearchQuery = debouncedSearchQuery.length >= 2;

  // Check if any filters are active (for showing Clear all button)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.status.length > 0 ||
      filters.dealStage.length > 0 ||
      filters.targetDate !== null ||
      filters.createdBy.length > 0 ||
      filters.assignee.length > 0
    );
  }, [filters]);

  // Get date range from target date option
  const targetDateRange = useMemo(() => getTargetDateRange(filters.targetDate), [filters.targetDate]);

  // Check if "Unassigned" is selected in assignee filter
  const hasUnassignedFilter = filters.assignee.includes(UNASSIGNED_FILTER_VALUE);
  // Get actual assignee IDs (excluding the special unassigned value)
  const actualAssigneeIds = filters.assignee.filter(id => id !== UNASSIGNED_FILTER_VALUE);

  // Expand status filters - replace special "SOW Submission (Pending)" with all pre-submission stages
  const expandedStatusFilters = useMemo(() => {
    if (filters.status.length === 0) return [];
    const expanded: string[] = [];
    for (const status of filters.status) {
      if (status === SOW_SUBMISSION_PENDING_FILTER) {
        expanded.push(...PRE_SUBMISSION_STAGES);
      } else {
        expanded.push(status);
      }
    }
    return expanded;
  }, [filters.status]);

  // Unified query: supports both search and all filters together
  const { data: dealsData, isLoading: isDealsLoading, error: dealsError, isFetching: isDealsFetching } = useGetDealsQuery({
    limit: PAGE_SIZE,
    after: undefined,
    q: hasValidSearchQuery ? debouncedSearchQuery : undefined, // Search query
    status: filters.dealStage.length > 0 ? filters.dealStage.join(',') : undefined, // Deal stage filter (comma-separated)
    targetDateStart: targetDateRange.start || undefined,
    targetDateEnd: targetDateRange.end || undefined,
    ownerIds: filters.createdBy.length > 0 ? filters.createdBy : undefined,
    assigneeIds: actualAssigneeIds.length > 0 ? actualAssigneeIds : undefined,
    unassignedOnly: hasUnassignedFilter ? true : undefined,
    phaseStatus: expandedStatusFilters.length > 0 ? expandedStatusFilters : undefined,
  }, { skip: hasPartialSearchQuery });

  // Reset pagination when filters/search changes
  useEffect(() => {
    setAllDeals([]);
    setNextCursor(undefined);
    setHasMoreDeals(false);
  }, [debouncedSearchQuery, filters.targetDate, filters.createdBy, filters.assignee, filters.status, filters.dealStage]);

  // Update accumulated deals when data loads
  useEffect(() => {
    if (dealsData) {
      setAllDeals(dealsData.results);
      setNextCursor(dealsData.paging?.next?.after || dealsData.after);
      // Only show "View More" if we got a full page AND the API says there's more
      const gotFullPage = dealsData.results.length >= PAGE_SIZE;
      const apiSaysMore = dealsData.hasMore || !!dealsData.paging?.next?.after;
      setHasMoreDeals(gotFullPage && apiSaysMore);
    }
  }, [dealsData]);

  // Determine loading and error states
  const isLoading = hasPartialSearchQuery ? false : (isDealsLoading || isDealsFetching);
  const error = dealsError;

  // Show loading when typing and waiting for debounce (only for 2+ chars)
  const isSearching = (searchQuery.length >= 2 && searchQuery !== debouncedSearchQuery) ||
                      (searchQuery.length < 2 && debouncedSearchQuery.length >= 2);

  // Use accumulated deals for display (but show empty when partial search query)
  const rawDeals = hasPartialSearchQuery ? [] : allDeals;

  // Load more deals function
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchMoreDeals({
        limit: PAGE_SIZE,
        after: nextCursor,
        q: hasValidSearchQuery ? debouncedSearchQuery : undefined, // Include search query
        status: filters.dealStage.length > 0 ? filters.dealStage.join(',') : undefined, // Deal stage filter
        targetDateStart: targetDateRange.start || undefined,
        targetDateEnd: targetDateRange.end || undefined,
        ownerIds: filters.createdBy.length > 0 ? filters.createdBy : undefined,
        assigneeIds: actualAssigneeIds.length > 0 ? actualAssigneeIds : undefined,
        unassignedOnly: hasUnassignedFilter ? true : undefined,
        phaseStatus: expandedStatusFilters.length > 0 ? expandedStatusFilters : undefined,
      }).unwrap();

      setAllDeals((prev) => [...prev, ...result.results]);
      setNextCursor(result.paging?.next?.after || result.after);
      // Only show "View More" if we got a full page AND the API says there's more
      const gotFullPage = result.results.length >= PAGE_SIZE;
      const apiSaysMore = result.hasMore || !!result.paging?.next?.after;
      setHasMoreDeals(gotFullPage && apiSaysMore);
    } catch (err) {
      console.error('Error loading more deals:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply client-side sorting
  const deals = useMemo(() => {
    let filtered = rawDeals;

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | number | null = null;
        let bVal: string | number | null = null;

        if (sortField === 'target_date') {
          aVal = a.target_date ? new Date(a.target_date).getTime() : 0;
          bVal = b.target_date ? new Date(b.target_date).getTime() : 0;
        } else if (sortField === 'amount') {
          aVal = typeof a.amount === 'string' ? parseFloat(a.amount) : (a.amount || 0);
          bVal = typeof b.amount === 'string' ? parseFloat(b.amount) : (b.amount || 0);
        } else if (sortField === 'assignee') {
          const aAssignee = getAssigneeForDeal(a);
          const bAssignee = getAssigneeForDeal(b);
          aVal = aAssignee?.name || '';
          bVal = bAssignee?.name || '';
        }

        if (aVal === null || bVal === null) return 0;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return filtered;
  }, [rawDeals, optimisticAssignees, sortField, sortDirection]);

  const formatCurrency = (amount: number | string | undefined) => {
    if (!amount) return '----';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '----';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  // Get phase display text
  // Phase shows the workflow stage: Unassigned -> SA Assigned -> SOW In Progress -> Technical Review -> Deal Desk Review
  const getPhaseDisplay = (deal: Deal): string => {
    // First check deal status for review workflow phases
    const dealStatus = (deal as any).status;
    if (dealStatus && PHASE_DISPLAY_LABELS[dealStatus]) {
      return PHASE_DISPLAY_LABELS[dealStatus];
    }

    // Check sow_gen_progress for SOW In Progress phase
    const sowGenProgress = (deal as any).sow_gen_progress;
    if (sowGenProgress && sowGenProgress !== 'NOT_STARTED' && sowGenProgress !== 'SUBMITTED_FOR_REVIEW') {
      return 'SOW In Progress';
    }

    // If we have phase from metadata, use it
    if (deal.phase) {
      return PHASE_DISPLAY_LABELS[deal.phase] || deal.phase;
    }

    // Fall back to determining from assignee
    const assignee = getAssigneeForDeal(deal);
    return assignee ? 'SA Assigned' : 'Unassigned';
  };

  // Get status display for a deal
  // Status column ONLY shows review-related statuses: Pending Review, Approved, Rework
  // No status badge shown for non-review states
  const getStatusDisplay = (deal: Deal): StatusBadgeConfig | null => {
    // Only check deal status for review workflow states
    const dealStatus = (deal as any).status;
    return getStatusBadgeConfig(dealStatus);
  };

  const handleAssigneeChange = async (dealId: string, deal: Deal, user: AssigneeUser | null) => {
    const originalAssignee = getAssigneeForDeal(deal);

    // Optimistic update
    setOptimisticAssignees(prev => ({
      ...prev,
      [dealId]: user
    }));

    try {
      if (user) {
        await assignDeal({
          dealId,
          assigneeId: user.id,
          assigneeName: user.name,
          dealName: deal.dealname
        }).unwrap();
      } else {
        await unassignDeal(dealId).unwrap();
      }
    } catch (err) {
      console.error('Failed to update deal assignment:', err);
      setOptimisticAssignees(prev => ({
        ...prev,
        [dealId]: originalAssignee
      }));
    }
  };

  // Sortable header component
  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-neutral-600 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-violet-600' : 'text-gray-400'}`} />
      </div>
    </th>
  );

  return (
    <div className="h-full flex flex-col p-6 min-w-0">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status Filter */}
        <SearchableMultiSelectFilter
          label="Status"
          options={STATUS_FILTER_OPTIONS}
          value={filters.status}
          onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          searchPlaceholder="Search status"
        />

        {/* Deal Stage Filter - Not shown for SA users (they only see Technical Validation) */}
        {!isSA && (
          <SearchableMultiSelectFilter
            label="Deal Stage"
            options={DEAL_STAGE_FILTER_OPTIONS}
            value={filters.dealStage}
            onChange={(value) => setFilters((prev) => ({ ...prev, dealStage: value }))}
            searchPlaceholder="Search stage"
          />
        )}

        {/* Target Date Filter */}
        <TargetDateFilter
          label="Target Date"
          value={filters.targetDate}
          onChange={(value) => setFilters((prev) => ({ ...prev, targetDate: value }))}
        />

        {/* Deal Owner Filter - Leadership only */}
        {isLeadership && (
          <SearchableMultiSelectFilter
            label="Deal Owner"
            options={ownerOptions}
            value={filters.createdBy}
            onChange={(value) => setFilters((prev) => ({ ...prev, createdBy: value }))}
            searchPlaceholder="Search"
          />
        )}

        {/* Assignee Filter - Leadership only */}
        {isLeadership && (
          <SearchableMultiSelectFilter
            label="Assignee"
            options={assigneeFilterOptions}
            value={filters.assignee}
            onChange={(value) => setFilters((prev) => ({ ...prev, assignee: value }))}
            searchPlaceholder="Search"
          />
        )}

        {/* Clear all filters button */}
        {hasActiveFilters && (
          <button
            onClick={() => setFilters({
              status: [],
              dealStage: [],
              targetDate: null,
              createdBy: [],
              assignee: [],
            })}
            className="px-3 py-1.5 text-sm text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded-lg transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Scrollable Deals Table */}
      <div className="flex-1 w-full max-w-full overflow-x-auto overflow-y-auto bg-white rounded-lg border border-gray-200">
        {(isLoading || isSearching) && <TableSkeleton rows={10} columns={8} />}

        {!isLoading && !isSearching && error && (
          <div className="text-center py-12">
            <p className="text-red-600">Error loading deals</p>
          </div>
        )}

        {!isLoading && !isSearching && !error && deals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {searchQuery && searchQuery.length < 2
                ? 'Enter at least 2 characters to search'
                : searchQuery
                  ? 'No deals found matching your search'
                  : 'No deals available'}
            </p>
          </div>
        )}

        {!isLoading && !isSearching && !error && deals.length > 0 && (
          <table className="w-full min-w-[1350px]">
            <thead className="bg-neutral-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 whitespace-nowrap">
                  Deal Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 whitespace-nowrap">
                  Deal Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 whitespace-nowrap">
                  Opportunity Type
                </th>
                <SortableHeader field="target_date" label="Target Date" />
                <SortableHeader field="amount" label="Budget" />
                <SortableHeader field="assignee" label="Assignee" />
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 whitespace-nowrap">
                  Phase
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deals.map((deal: Deal) => {
                const stageLabel = deal.dealstage_label || 'Unknown';
                const getBadgeClasses = () => {
                  if (stageLabel === 'Technical Validation') {
                    return 'bg-violet-100 text-violet-700';
                  } else if (stageLabel === 'Business Validation') {
                    return 'bg-blue-100 text-blue-700';
                  } else if (stageLabel === 'Committed') {
                    return 'bg-green-100 text-green-700';
                  } else if (stageLabel === 'Deal Lost') {
                    return 'bg-red-100 text-red-700';
                  }
                  return 'bg-gray-100 text-gray-700';
                };

                const assignee = getAssigneeForDeal(deal);
                const phase = getPhaseDisplay(deal);

                return (
                  <tr
                    key={deal.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Deal Title with Stage Badge */}
                    <td
                      className="px-6 py-4 cursor-pointer max-w-xs"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-neutral-800 truncate">
                          {deal.dealname || 'Untitled Deal'}
                        </span>
                        <span className={`inline-block w-fit px-2 py-0.5 text-xs font-medium rounded ${getBadgeClasses()}`}>
                          {stageLabel}
                        </span>
                      </div>
                    </td>

                    {/* Deal Owner */}
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      <span className="text-sm text-neutral-800">
                        {deal.hubspot_owner_name || '----'}
                      </span>
                    </td>

                    {/* Opportunity Type */}
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      <span className="text-sm text-neutral-800">
                        {deal.opportunity || '----'}
                      </span>
                    </td>

                    {/* Target Date */}
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      <span className="text-sm text-neutral-800">
                        {formatDate(deal.target_date)}
                      </span>
                    </td>

                    {/* Budget (Amount) */}
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      <span className="text-sm font-medium text-neutral-800">
                        {formatCurrency(deal.amount)}
                      </span>
                    </td>

                    {/* Assignee - Only show dropdown for Technical Validation deals */}
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {canAssignDeals && stageLabel === 'Technical Validation' ? (
                        <AssigneeDropdown
                          value={assignee}
                          onChange={(user) => handleAssigneeChange(deal.id, deal, user)}
                          users={assigneeUsers}
                        />
                      ) : (
                        <div className="flex items-center gap-2 justify-center">
                          {assignee ? (
                            <>
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                style={{ backgroundColor: assignee.color }}
                              >
                                {assignee.initials}
                              </div>
                              <span className="text-sm text-neutral-800">{assignee.name}</span>
                            </>
                          ) : (
                            <span className="text-sm text-neutral-400">Unassigned</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Phase */}
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      <span className="text-sm text-neutral-800">
                        {phase}
                      </span>
                    </td>

                    {/* Status */}
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      {(() => {
                        const statusDisplay = getStatusDisplay(deal);
                        if (!statusDisplay) {
                          return <span className="text-sm text-neutral-400">---</span>;
                        }
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(statusDisplay.variant)}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              statusDisplay.variant === 'blue' ? 'bg-blue-500' :
                              statusDisplay.variant === 'green' ? 'bg-green-500' :
                              statusDisplay.variant === 'orange' ? 'bg-orange-500' :
                              'bg-gray-400'
                            }`} />
                            {statusDisplay.label}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* View More Button */}
        {!isLoading && !isSearching && !error && deals.length > 0 && hasMoreDeals && (
          <div className="flex justify-center py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2 text-sm font-medium text-violet-600 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 hover:border-violet-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                `View More (${deals.length} shown)`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
