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
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache

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
    database: "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 dark:from-blue-950/50 dark:to-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm",
    api: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm",
    csv: "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 dark:from-orange-950/50 dark:to-orange-900/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shadow-sm",
    dataset: "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 dark:from-purple-950/50 dark:to-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm",
    dashboard: "bg-gradient-to-r from-pink-50 to-pink-100 text-pink-700 dark:from-pink-950/50 dark:to-pink-900/50 dark:text-pink-300 border border-pink-200 dark:border-pink-800 shadow-sm",
    table: "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 dark:from-slate-900/50 dark:to-slate-800/50 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm",
  };
  return colors[type as keyof typeof colors] || "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 dark:from-slate-900/50 dark:to-slate-800/50 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm";
};

export function SearchBar() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  
  // Use ref to track abort controller
  const abortControllerRef = React.useRef<AbortController | null>(null);

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

  // Search function with proper debouncing
  React.useEffect(() => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (trimmedQuery.length < 2) {
      return; // Wait for at least 2 characters
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const performSearch = async () => {
      // Check cache first
      const cachedResult = searchResultsCache.get(trimmedQuery.toLowerCase());
      if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
        setResults(cachedResult.results);
        setLoading(false);
        return;
      }

      // Create new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal
        });
        
        if (response.ok && !controller.signal.aborted) {
          const data = await response.json();
          const searchResults = data.results || [];
          
          setResults(searchResults);
          
          // Cache the results
          searchResultsCache.set(trimmedQuery.toLowerCase(), {
            results: searchResults,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Search error:', error);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(performSearch, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.url);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Cancel any ongoing search when closing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
      return (        <>
          <CommandGroup heading="✨ Quick Actions">
            <CommandItem 
              onSelect={() => { setOpen(false); router.push('/dashboard'); }} 
              className="group flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-950/20 dark:hover:to-blue-900/20 transition-all duration-200 rounded-lg mx-2 my-1 cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="font-semibold text-foreground">Browse Connections</span>
                <p className="text-xs text-muted-foreground">Explore your database connections</p>
              </div>
            </CommandItem>
            <CommandItem 
              onSelect={() => { setOpen(false); router.push('/dashboard/datasets'); }} 
              className="group flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-950/20 dark:hover:to-purple-900/20 transition-all duration-200 rounded-lg mx-2 my-1 cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <span className="font-semibold text-foreground">View Datasets</span>
                <p className="text-xs text-muted-foreground">Browse your data collections</p>
              </div>
            </CommandItem>
            <CommandItem 
              onSelect={() => { setOpen(false); router.push('/dashboard/my-dashboards'); }} 
              className="group flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-pink-50 hover:to-pink-100 dark:hover:from-pink-950/20 dark:hover:to-pink-900/20 transition-all duration-200 rounded-lg mx-2 my-1 cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
                <LayoutDashboard className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <span className="font-semibold text-foreground">My Dashboards</span>
                <p className="text-xs text-muted-foreground">Access your analytics boards</p>
              </div>
            </CommandItem>
          </CommandGroup>
          
        </>
      );
    }    // Show loading state when loading and no results
    if (loading && results.length === 0) {
      return (
        <CommandGroup>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 px-4 py-3 ">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-foreground font-medium">Searching across all data sources...</span>
            </div>
          </div>
        </CommandGroup>
      );
    }    // Show empty state
    if (results.length === 0 && !loading && query.trim().length >= 2) {
      return (
        <CommandGroup>
          <div className="text-center py-8 px-4">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-muted/50">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-foreground font-semibold mb-1">No results found for "{query}"</p>
            <p className="text-xs text-muted-foreground">
              Try different keywords or check your spelling
            </p>
          </div>
        </CommandGroup>
      );
    }

    // Show results
    return (
      <>        {loading && results.length > 0 && (
          <div className="flex items-center justify-center py-2 border-b bg-muted/30">
            <Loader2 className="h-3 w-3 animate-spin mr-2 text-primary" />
            <span className="text-xs text-foreground font-semibold">Updating results...</span>
          </div>
        )}
        {Object.entries(groupedResults).map(([groupName, groupResults], index) => (
          <React.Fragment key={groupName}>
            <CommandGroup heading={`${groupName} (${groupResults.length})`}>
              {groupResults.map((result) => {
                const IconComponent = getIcon(result.icon);
                return (                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all duration-200 rounded-lg mx-2 my-1 cursor-pointer border border-transparent hover:border-border/50"
                  >
                    <div className="p-2 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                      <IconComponent className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                          {result.title}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-0.5 font-medium border-0 transition-all duration-200 group-hover:scale-105 ${getTypeColor(result.type)}`}
                        >
                          {result.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.description}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {index < Object.keys(groupedResults).length - 1 && <CommandSeparator className="my-1" />}
          </React.Fragment>
        ))}        {results.length >= 25 && (
          <div className="px-4 py-3 text-center border-t bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800 mx-2 mb-2 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              📊 Showing first 25 results. Try more specific terms for better matches.
            </p>
          </div>
        )}
      </>
    );
  };  return (
    <div>      <Tooltip content="Search everything (CTRL + K)" placement="bottom">
        <p
          onClick={() => setOpen(true)}
          className="border-none group hover:text-primary cursor-pointer transition-all ease-in-out rounded-md text-sm text-foreground"
        >
          <FaSearch className="inline-block mr-2 text-primary" />
          <span className="font-">Search</span>
          <kbd className="pointer-events-none group-hover:bg-primary/20 group-hover:text-primary transition-all ease-in-out group-hover:border-primary/30 inline-flex h-5 ml-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground opacity-100">
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
            className="text-sm font-medium text-foreground"
          />
          <CommandList>
            {renderContent()}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
