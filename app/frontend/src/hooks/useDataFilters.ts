import { useState, useMemo } from 'react';

interface UseDataFiltersOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  filterFn?: (item: T, filterValue: string) => boolean;
  defaultFilterValue?: string;
}

/**
 * Data Filtering and Search Hook
 * 
 * Combined hook for search and filter functionality across data tables.
 * Provides consistent filtering behavior for all resource pages
 * (Projects, Blueprints, Images, Instances, Security).
 */
export function useDataFilters<T>({
  data,
  searchFields,
  filterFn,
  defaultFilterValue = 'all',
}: UseDataFiltersOptions<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState(defaultFilterValue);

  const filteredData = useMemo(() => {
    let result = data;

    // Apply status/category filter first
    if (filterValue !== 'all' && filterFn) {
      result = result.filter((item) => filterFn(item, filterValue));
    }

    // Then apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    return result;
  }, [data, searchQuery, filterValue, searchFields, filterFn]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterValue(defaultFilterValue);
  };

  return {
    // Search
    searchQuery,
    setSearchQuery,
    
    // Filter
    filterValue,
    setFilterValue,
    
    // Results
    filteredData,
    
    // Utilities
    resetFilters,
    hasActiveFilters: searchQuery.trim() !== '' || filterValue !== defaultFilterValue,
  };
}