/**
 * Deal List Item Component
 *
 * Card component for displaying deal information
 */

'use client';

export interface DealListItemProps {
  dealName: string;
  createdBy: string;
  closeDate: string;
  createdOn: string;
  fundingType: string;
  amount: string;
  onClick?: () => void;
}

export function DealListItem({
  dealName,
  createdBy,
  closeDate,
  createdOn,
  fundingType,
  amount,
  onClick,
}: DealListItemProps) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md cursor-pointer mb-3"
      onClick={onClick}
    >
      {/* Single Row Grid with Deal Name and Details */}
      <div className="grid gap-4 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}>
        {/* Deal Name - Takes 2x space */}
        <div>
          <p className="text-sm font-medium text-gray-900">{dealName}</p>
        </div>

        {/* Created By */}
        <div>
          <p className="text-xs text-neutral-600 mb-0.1">Created By</p>
          <p className="text-sm font-medium text-gray-900">{createdBy}</p>
        </div>

        {/* Close Date */}
        <div>
          <p className="text-xs text-neutral-600 mb-0.1">Close Date</p>
          <p className="text-sm font-medium text-gray-900">{closeDate}</p>
        </div>

        {/* Created On */}
        <div>
          <p className="text-xs text-neutral-600 mb-0.1">Created On</p>
          <p className="text-sm font-medium text-gray-900">{createdOn}</p>
        </div>

        {/* Funding Type */}
        <div>
          <p className="text-xs text-neutral-600 mb-0.1">Funding Type</p>
          <p className="text-sm font-medium text-gray-900">{fundingType}</p>
        </div>

        {/* Amount */}
        <div>
          <p className="text-xs text-neutral-600 mb-0.1">Amount</p>
          <p className="text-sm font-semibold text-gray-900">{amount}</p>
        </div>
      </div>
    </div>
  );
}
