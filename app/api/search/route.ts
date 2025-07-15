import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import { auth } from '@clerk/nextjs/server';

// Cache for search results
const searchCache = new Map<string, { results: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Helper function to create search patterns for better single word matching
function createSearchPatterns(query: string) {
  const cleanQuery = query.trim().toLowerCase();
  const words = cleanQuery.split(/\s+/);
  
  return {
    exact: cleanQuery,
    startsWith: `${cleanQuery}%`,
    contains: `%${cleanQuery}%`,
    words: words,
    // Create patterns for each word
    wordPatterns: words.map(word => `%${word}%`)
  };
}

// Helper function to score search results for better relevance
function scoreResult(title: string, description: string, query: string): number {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  let score = 0;
  
  // Exact match gets highest score
  if (titleLower === queryLower) score += 100;
  
  // Title starts with query
  if (titleLower.startsWith(queryLower)) score += 50;
  
  // Title contains query
  if (titleLower.includes(queryLower)) score += 25;
  
  // Word matching in title
  queryWords.forEach(word => {
    if (titleLower.includes(word)) score += 10;
    if (titleLower.startsWith(word)) score += 15;
  });
  
  // Description matching (lower weight)
  if (descLower.includes(queryLower)) score += 5;
  queryWords.forEach(word => {
    if (descLower.includes(word)) score += 2;
  });
  
  return score;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    // Check cache first
    const cacheKey = `${userId}-${query}-${type}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ results: cached.results });
    }

    const patterns = createSearchPatterns(query);
    const results: any[] = [];
    
    // Use Promise.allSettled for parallel execution of non-dependent queries
    const searchPromises = [];    // Search databases
    if (type === 'all' || type === 'databases') {
      searchPromises.push(
        supabaseClient
          .from('database_connections')
          .select('id, connection_name, database_type, host')
          .eq('user_id', userId)
          .or(`connection_name.ilike.${patterns.contains},database_type.ilike.${patterns.contains}`)
          .limit(20)
          .then(({ data }) => {
            if (data) {
              return data.map(conn => ({
                id: conn.id,
                title: conn.connection_name,
                type: 'database',
                description: `${conn.database_type} • ${conn.host}`,
                icon: 'database',
                url: `/dashboard/db-details/${conn.id}`,
                score: scoreResult(conn.connection_name, `${conn.database_type} ${conn.host}`, query)
              }));
            }
            return [];
          })
      );
    }

    // Search API connections
    if (type === 'all' || type === 'connections') {
      searchPromises.push(
        supabaseClient
          .from('api_connections')
          .select('id, connection_name, api_url, database_connection_id, table_name')
          .eq('user_id', userId)
          .or(`connection_name.ilike.${patterns.contains},table_name.ilike.${patterns.contains}`)
          .limit(20)
          .then(({ data }) => {
            if (data) {
              return data.map(conn => {
                let hostname;
                try {
                  hostname = new URL(conn.api_url).hostname;
                } catch {
                  hostname = conn.api_url;
                }
                
                return {
                  id: conn.id,
                  title: conn.connection_name,
                  type: 'api',
                  description: conn.table_name ? `${conn.table_name} • ${hostname}` : hostname,
                  icon: 'globe',
                  url: conn.database_connection_id && conn.table_name 
                    ? `/dashboard/db-details/${conn.database_connection_id}/tables/${conn.table_name}`
                    : `/dashboard/api-details/${conn.id}`,
                  score: scoreResult(conn.connection_name, `${conn.table_name || ''} ${hostname}`, query)
                };
              });
            }
            return [];
          })
      );
    }

    // Search CSV connections
    if (type === 'all' || type === 'connections') {
      searchPromises.push(
        supabaseClient
          .from('csvData')
          .select('id, connection_name, file_name')
          .eq('user_id', userId)
          .or(`connection_name.ilike.${patterns.contains},file_name.ilike.${patterns.contains}`)
          .limit(20)
          .then(({ data }) => {
            if (data) {
              return data.map(conn => ({
                id: conn.id,
                title: conn.connection_name || conn.file_name,
                type: 'csv',
                description: conn.file_name,
                icon: 'file-spreadsheet',
                url: `/dashboard/csv-details/${conn.id}`,
                score: scoreResult(conn.connection_name || conn.file_name, conn.file_name, query)
              }));
            }
            return [];
          })
      );
    }

    // Search datasets
    if (type === 'all' || type === 'datasets') {
      searchPromises.push(
        supabaseClient
          .from('datasets')
          .select('id, dataset_name, dataset_description, connection_id, api_id, csv_id')
          .eq('user_id', userId)
          .or(`dataset_name.ilike.${patterns.contains},dataset_description.ilike.${patterns.contains}`)
          .limit(20)
          .then(({ data }) => {
            if (data) {
              return data.map(dataset => ({
                id: dataset.id,
                title: dataset.dataset_name,
                type: 'dataset',
                description: dataset.dataset_description || 'No description',
                icon: 'layers',
                url: `/dashboard/datasets/${dataset.connection_id || dataset.api_id || dataset.csv_id}/${dataset.id}/${encodeURIComponent(dataset.dataset_name)}`,
                score: scoreResult(dataset.dataset_name, dataset.dataset_description || '', query)
              }));
            }
            return [];
          })
      );
    }

    // Search dashboards
    if (type === 'all' || type === 'dashboards') {
      searchPromises.push(
        supabaseClient
          .from('dashboards')
          .select('id, name, description')
          .eq('user_id', userId)
          .neq('type', 'sample')
          .or(`name.ilike.${patterns.contains},description.ilike.${patterns.contains}`)
          .limit(20)
          .then(({ data }) => {
            if (data) {
              return data.map(dashboard => ({
                id: dashboard.id,
                title: dashboard.name,
                type: 'dashboard',
                description: dashboard.description || 'No description',
                icon: 'layout-dashboard',
                url: `/dashboard/my-dashboards/${dashboard.id}`,
                score: scoreResult(dashboard.name, dashboard.description || '', query)
              }));
            }
            return [];
          })
      );
    }

    // Execute all parallel searches
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Collect results from successful searches
    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        results.push(...result.value);
      }
    });

    // Search tables from database connections (separate because it needs sequential processing)
    if (type === 'all' || type === 'tables') {
      try {
        const { data: dbConnections } = await supabaseClient
          .from('database_connections')
          .select('id, connection_name')
          .eq('user_id', userId)
          .limit(10); // Limit connections to search for performance

        if (dbConnections) {
          // Process connections in parallel with limited concurrency
          const tablePromises = dbConnections.map(async (conn) => {
            try {
              const response = await Promise.race([
                fetch(`${req.nextUrl.origin}/api/database/${conn.id}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
              ]) as Response;
              
              if (response.ok) {
                const tables = await response.json();
                const matchingTables = Array.isArray(tables) 
                  ? tables.filter((table: string) => {
                      const tableLower = table.toLowerCase();
                      return patterns.words.some(word => tableLower.includes(word)) ||
                             tableLower.includes(patterns.exact);
                    }).slice(0, 5) // Limit tables per connection
                  : [];

                return matchingTables.map((table: string) => ({
                  id: `${conn.id}-${table}`,
                  title: table.charAt(0).toUpperCase() + table.slice(1).replace(/_/g, ' '),
                  type: 'table',
                  description: `Table in ${conn.connection_name}`,
                  icon: 'table',
                  url: `/dashboard/db-details/${conn.id}/tables/${table}`,
                  score: scoreResult(table, `Table in ${conn.connection_name}`, query)
                }));
              }
            } catch (error) {
              console.error(`Error fetching tables for connection ${conn.id}:`, error);
            }
            return [];
          });

          const tableResults = await Promise.allSettled(tablePromises);
          tableResults.forEach(result => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
              results.push(...result.value);
            }
          });
        }
      } catch (error) {
        console.error('Error searching tables:', error);
      }
    }    // Sort results by relevance score (highest first)
    const sortedResults = results.sort((a, b) => {
      // First sort by score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      // Then by alphabetical order for ties
      return a.title.localeCompare(b.title);
    });

    // Limit results and remove score from final output
    const limitedResults = sortedResults.slice(0, 30).map(result => {
      const { score, ...resultWithoutScore } = result;
      return resultWithoutScore;
    });

    // Cache the results
    searchCache.set(cacheKey, {
      results: limitedResults,
      timestamp: Date.now()
    });    // Clean old cache entries periodically
    if (searchCache.size > 1000) {
      const now = Date.now();
      Array.from(searchCache.entries()).forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_TTL) {
          searchCache.delete(key);
        }
      });
    }

    return NextResponse.json({ results: limitedResults });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
    