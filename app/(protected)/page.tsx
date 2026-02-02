/**
 * Dashboard Page
 *
 * Main landing page with chat interface and recent deals
 */

'use client';

import { useEffect } from 'react';
import { ChatInterface } from '@/components/features/chat/ChatInterface';
import { RecentDealsList } from '@/components/features/deals/RecentDealsList';

export default function Dashboard() {
  useEffect(() => {
    document.title = 'Dashboard - SOW Generator';
    return () => {
      document.title = 'SOW Generator';
    };
  }, []);

  return (
    <div className="flex flex-col p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-primary-90">
          Oscar: Turning Meetings into Actionable Insights
        </h1>
      </div>

      {/* Dashboard Layout - Desktop: side by side, Mobile: single column */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Column - Chat Interface */}
        <div className="flex-1 min-w-0 min-h-[600px] lg:min-h-0">
          <ChatInterface />
        </div>

        {/* Right Column - Recent Deals */}
        <div className="lg:w-1/3 md:min-w-[300px] lg:min-w-[550px] overflow-y-auto">
          <RecentDealsList />
        </div>
      </div>
    </div>
  );
}
