/**
 * Deals Search Context
 *
 * Provides shared search state between Header and Deals page.
 * When on the Deals list page, the search in the header filters the table.
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DealsSearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const DealsSearchContext = createContext<DealsSearchContextType | undefined>(undefined);

export function DealsSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <DealsSearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery: handleSetSearchQuery,
      }}
    >
      {children}
    </DealsSearchContext.Provider>
  );
}

export function useDealsSearch() {
  const context = useContext(DealsSearchContext);
  if (context === undefined) {
    throw new Error('useDealsSearch must be used within a DealsSearchProvider');
  }
  return context;
}
