/**
 * Tabs Component
 *
 * Reusable tabbed navigation with active state indicator
 */

'use client';

interface Tab<T extends string = string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string = string> {
  tabs: Tab<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({ tabs, activeTab, onTabChange, className = '' }: TabsProps<T>) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <div className="flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`cursor-pointer pb-3 px-1 min-w-[150px] text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-violet-950'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-violet-950" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
