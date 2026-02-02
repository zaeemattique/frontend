/**
 * Deal Card Component
 *
 * Displays a single deal card with Technical Validation badge
 */

'use client';

interface DealCardProps {
  dealName: string;
  dealOwner: string;
  targetDate: string;
  budget: string;
  assignee: string;
  onClick?: () => void;
}

export function DealCard({
  dealName,
  dealOwner,
  targetDate,
  budget,
  assignee,
  onClick,
}: DealCardProps) {
  const details = [
    { label: 'Deal Owner', value: dealOwner },
    { label: 'Target Date', value: targetDate },
    { label: 'Budget', value: budget },
    { label: 'Assignee', value: assignee },
  ];

  return (
    <div
      className={`bg-white rounded-lg border border-neutral-200 p-6 transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
      style={{ boxShadow: '0px 0.79px 0.39px 0.04px #1D293D05' }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-3">
        {/* Badge and Deal Name */}
        <div className="flex items-start gap-3">
          <span className="inline-block px-2.5 py-1 text-xs bg-violet-50 text-violet-600 rounded-md whitespace-nowrap">
            Technical Validation
          </span>
          <h3 className="text-neutral-800 text-base font-semibold leading-6 flex-1">
            {dealName}
          </h3>
        </div>

        {/* Deal Details Grid */}
        <div className="grid grid-cols-4 gap-4">
          {details.map((detail, index) => (
            <div key={index}>
              <p className={`text-xs mb-1 text-neutral-600 font-medium`}>
                {detail.label}
              </p>
              <p className={`text-sm text-neutral-800 font-medium`}>
                {detail.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
