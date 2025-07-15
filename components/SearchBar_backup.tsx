import React from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Database, 
  Globe, 
  FileSpreadsheet, 
  Layers, 
  LayoutDashboard, 
  Table, 
  Search,
  Loader2
} from "lucide-react";
import { FaSearch } from "react-icons/fa";
import { Tooltip } from "@heroui/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  type: 'database' | 'api' | 'csv' | 'dataset' | 'dashboard' | 'table';
  description: string;
  icon: string;
  url: string;
}

// Cache for search results to avoid repeated API calls
const searchResultsCache = new Map<string, { results: SearchResult[], timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache for faster subsequent searches

// Recently searched queries for instant results
const recentQueries = new Map<string, SearchResult[]>();
const MAX_RECENT_QUERIES = 20;

const getIcon = (iconName: string) => {
  const icons = {
    database: Database,
    globe: Globe,
    'file-spreadsheet': FileSpreadsheet,
    layers: Layers,
    'layout-dashboard': LayoutDashboard,
    table: Table,
  };
  return icons[iconName as keyof typeof icons] || Search;
};

const getTypeColor = (type: string) => {
  const colors = {
    database: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    api: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    csv: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    dataset: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    dashboard: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    table: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  };
  return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
};

export function SearchBar() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [lastSearchTime, setLastSearchTime] = React.useState(0);
  const router = useRouter();
  
  // Ref to track the current search request to avoid race conditions
  const currentSearchRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Optimized search function with caching and instant results
  const performSearch = React.useCallback(async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    
    if (!trimmedQuery || trimmedQuery.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Check cache first for instant results
    const cachedResult = searchResultsCache.get(trimmedQuery);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      setResults(cachedResult.results);
      setLoading(false);
      return;
    }

    // Check recent queries for partial matches (instant suggestions)
    const recentMatch = Array.from(recentQueries.entries()).find(([key]) => 
      key.startsWith(trimmedQuery) || trimmedQuery.startsWith(key)
    );
    if (recentMatch && trimmedQuery.length >= 2) {
      // Show cached results immediately while fetching fresh ones
      setResults(recentMatch[1]);
    }

    // Cancel previous search request
    if (currentSearchRef.current) {
      currentSearchRef.current.abort();
    }

    const abortController = new AbortController();
    currentSearchRef.current = abortController;

    setLoading(true);
    const searchStartTime = Date.now();
    setLastSearchTime(searchStartTime);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: abortController.signal
      });
      
      // Only process if this is the latest search
      if (searchStartTime >= lastSearchTime && response.ok) {
        const data = await response.json();
        const searchResults = data.results || [];
        
        setResults(searchResults);
        
        // Cache the results
        searchResultsCache.set(trimmedQuery, {
          results: searchResults,
          timestamp: Date.now()
        });
          // Add to recent queries
        recentQueries.set(trimmedQuery, searchResults);
        if (recentQueries.size > MAX_RECENT_QUERIES) {
          const firstKey = recentQueries.keys().next().value;
          if (firstKey) {
            recentQueries.delete(firstKey);
          }
        }
      } else if (!response.ok && searchStartTime >= lastSearchTime) {
        setResults([]);
      }    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError' && searchStartTime >= lastSearchTime) {
        console.error('Search error:', error);
        setResults([]);
      }
    } finally {
      if (searchStartTime >= lastSearchTime) {
        setLoading(false);
      }
    }
  }, [lastSearchTime]);

  // Faster debouncing with immediate start for short queries
  React.useEffect(() => {
    const trimmedQuery = query.trim();
    
    // For very short queries, search immediately with no debounce
    if (trimmedQuery.length <= 2 && trimmedQuery.length > 0) {
      performSearch(trimmedQuery);
      return;
    }
    
    // For longer queries, use shorter debounce for faster response
    const debounceTimer = setTimeout(() => performSearch(trimmedQuery), 100);
    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);
  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    
    // Add to recent searches for instant access
    const queryLower = query.toLowerCase().trim();
    if (queryLower && !recentQueries.has(queryLower)) {
      recentQueries.set(queryLower, [result]);
    }
    
    router.push(result.url);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Cancel any ongoing search when closing
      if (currentSearchRef.current) {
        currentSearchRef.current.abort();
      }
      
      // Clear search state when closing
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  };

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (currentSearchRef.current) {
        currentSearchRef.current.abort();
      }
    };
  }, []);

  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(result => {
      const groupKey = result.type.charAt(0).toUpperCase() + result.type.slice(1) + 's';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(result);
    });
    return groups;
  }, [results]);
  const renderContent = () => {
    // Show quick actions when no query
    if (!query.trim()) {
      return (
        <>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard'); }}>
              <Database className="mr-2 h-4 w-4" />
              <span>Browse Connections</span>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard/datasets'); }}>
              <Layers className="mr-2 h-4 w-4" />
              <span>View Datasets</span>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard/my-dashboards'); }}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>My Dashboards</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">
              💡 Lightning-fast search across all your data sources
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start typing for instant results
            </p>
          </div>
        </>
      );
    }

    // Show loading state only when truly loading and no cached results
    if (loading && results.length === 0) {
      return (
        <CommandGroup>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Searching...</span>
          </div>
        </CommandGroup>
      );
    }

    // Show search results or empty state
    if (results.length === 0 && !loading) {
      return (
        <CommandGroup>
          <div className="text-center py-6">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try different keywords or check spelling
            </p>
          </div>
        </CommandGroup>
      );
    }

    // Show search results grouped by type with loading indicator if refreshing
    return (
      <>
        {loading && results.length > 0 && (
          <div className="flex items-center justify-center py-2 border-b">
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
            <span className="text-xs text-muted-foreground">Updating results...</span>
          </div>
        )}
        {Object.entries(groupedResults).map(([groupName, groupResults], index) => (
          <React.Fragment key={groupName}>
            <CommandGroup heading={`${groupName} (${groupResults.length})`}>
              {groupResults.map((result) => {
                const IconComponent = getIcon(result.icon);
                return (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium truncate">{result.title}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs px-1.5 py-0.5 flex-shrink-0 ${getTypeColor(result.type)}`}
                          >
                            {result.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </p>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {index < Object.keys(groupedResults).length - 1 && <CommandSeparator />}
          </React.Fragment>
        ))}
        {results.length >= 25 && (
          <div className="px-3 py-2 text-center border-t">
            <p className="text-xs text-muted-foreground">
              Showing first 25 results. Try more specific terms for better matches.
            </p>
          </div>
        )}
      </>
    );
  };
  return (
    <div>
      <Tooltip content="Lightning-fast search across databases, tables, datasets, dashboards... (CTRL + K)" placement="bottom">
        <p
          onClick={() => setOpen(true)}
          className="border-none group hover:text-foreground cursor-pointer transition-all ease-in-out rounded-md text-sm text-muted-foreground"
        >
          <FaSearch className="inline-block mr-2" />
          Search
          <kbd className="pointer-events-none group-hover:bg-zinc-800 transition-all ease-in-out group-hover:border-none inline-flex h-5 ml-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">CTRL</span>K
          </kbd>
        </p>
      </Tooltip>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search databases, tables, datasets, dashboards..." 
            value={query}
            onValueChange={setQuery}
            className="text-sm"
          />
          <CommandList>
            {renderContent()}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
