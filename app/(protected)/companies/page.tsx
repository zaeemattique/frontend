/**
 * Companies Page
 *
 * List and search companies from HubSpot
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGetCompaniesQuery, useSearchCompaniesQuery } from '@/store/services/api';
import { SearchBox } from '@/components/ui/SearchBox';
import { TableSkeleton } from '@/components/ui/Loader';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce the search query
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Always call both hooks, but skip the one we don't need
  const searchResult = useSearchCompaniesQuery(
    { query: debouncedSearch, limit: 50 },
    { skip: !debouncedSearch }
  );
  const listResult = useGetCompaniesQuery(
    { limit: 50 },
    { skip: !!debouncedSearch }
  );

  // Use search result if search is active, otherwise use list result
  const { data, isLoading, error } = debouncedSearch ? searchResult : listResult;

  const companies = data?.results || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="mt-2 text-sm text-gray-600">
            Browse and search companies from HubSpot
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search companies by name, domain, or industry..."
            className="flex-1"
          />
          <div className="text-sm text-gray-600">
            {total} {total === 1 ? 'company' : 'companies'}
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="card">
        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load companies</p>
            <p className="text-sm text-gray-500 mt-2">
              Please try again or contact support
            </p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No companies found</p>
            {searchQuery && (
              <p className="text-sm mt-2">
                Try adjusting your search query
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {company.name}
                      </div>
                      {company.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {company.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {company.domain ? (
                        <a
                          href={`https://${company.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {company.domain}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {company.industry || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(company.createdate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/deals?company_id=${company.id}`}
                        className="text-blue-600 hover:text-blue-700 mr-4"
                      >
                        View Deals
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Info */}
      {!isLoading && companies.length > 0 && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <p>Showing {companies.length} of {total} companies</p>
          {data?.hasMore && (
            <p className="text-gray-500">
              Load more functionality coming soon
            </p>
          )}
        </div>
      )}
    </div>
  );
}
