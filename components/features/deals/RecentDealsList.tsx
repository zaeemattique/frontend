/**
 * Recent Deals List Component
 *
 * Shows a list of recent Technical Validation deals
 * For Leadership users: shows Unassigned deals
 * For other users: shows recent deals
 */

'use client';

import { useRouter } from 'next/navigation';
import { useGetDealsQuery } from '@/store/services/api';
import { useAuth } from '@/hooks/useAuth';
import { DealCard } from './DealCard';
import { CardSkeleton } from '@/components/ui/Loader';
import type { Deal } from '@/types';

export function RecentDealsList() {
  const router = useRouter();
  const { hasGroup } = useAuth();

  // Check if user is Leadership
  const isLeadership = hasGroup('Leadership');

  // Fetch deals - for Leadership, fetch unassigned Technical Validation deals only
  // Pass status filter to backend for efficient server-side filtering
  const { data: dealsData, isLoading, error } = useGetDealsQuery({
    limit: 50, // Fetch more to account for post-fetch filtering
    status: 'technical_validation', // Filter by Technical Validation stage on server
    unassignedOnly: isLeadership ? true : undefined,
  });

  // Get deals from response (already filtered by backend)
  const filteredDeals = (dealsData?.results || []).slice(0, 10); // Limit to 10 for display

  const formatCurrency = (amount: number | string | undefined) => {
    if (!amount) return '--';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  // Empty message based on user role
  const emptyMessage = isLeadership ? 'No unassigned deals' : 'No recent deals';

  return (
    <div className="bg-neutral-50 rounded-lg p-6 h-[600px] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-neutral-800 text-lg font-semibold">
          Recent Deals
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-gray-600">Unable to load deals</p>
        </div>
      )}

      {/* Deals List */}
      {!isLoading && !error && (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {filteredDeals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{emptyMessage}</p>
            </div>
          ) : (
            filteredDeals.map((deal: Deal) => (
              <DealCard
                key={deal.id}
                dealName={deal.dealname || 'Untitled Deal'}
                dealOwner={deal.hubspot_owner_name || '--'}
                targetDate={formatDate(deal.target_date)}
                budget={formatCurrency(deal.amount)}
                assignee={deal.assignee?.name || '--'}
                onClick={() => router.push(`/deals/${deal.id}`)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
