// app/api/gemini/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  connectToMySQL,
  connectToPostgres,
  getMySQLColumnTypes,
  getPostgresColumnTypes,
} from "@/utils/databaseUtils";
import { getDbConnectionDetails, setDbConnectionDetails } from "@/lib/dbCache";
import supabaseClient from "@/lib/supabaseClient";

// Cache for schemas, conversation history, query explanations, and AI responses
const schemaCache = new Map<string, any>();
const conversationCache = new Map<
  string,
  { role: string; content: string }[]
>();
const aiResponseCache = new Map<string, { response: string; timestamp: number }>();

// Query explanation cache - stores explanations by query hash
const queryExplanationCache = new Map<
  string,
  {
    explanation: string;
    timestamp: number;
    type: "explain" | "optimize";
  }
>();

// Helper function to generate query hash for caching
function generateQueryHash(
  query: string,
  type: string,
  connectionId?: string
): string {
  const cleanQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  return `${type}_${connectionId || "default"}_${Buffer.from(cleanQuery)
    .toString("base64")
    .slice(0, 32)}`;
}

// Cache expiry time (24 hours for schema, 2 hours for explanations, 1 hour for AI responses)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;
const EXPLANATION_CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours for explanations
const AI_CACHE_EXPIRY_MS = 60 * 60 * 1000;

// Helper function to clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  queryExplanationCache.forEach((value, key) => {
    if (now - value.timestamp > EXPLANATION_CACHE_EXPIRY_MS) {
      keysToDelete.push(key);
    }
  });

  aiResponseCache.forEach((value, key) => {
    if (now - value.timestamp > AI_CACHE_EXPIRY_MS) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    queryExplanationCache.delete(key);
    aiResponseCache.delete(key);
  });
}

// Clean cache every 30 minutes
setInterval(cleanExpiredCache, 30 * 60 * 1000);

const API_KEY = "AIzaSyDqYGX7pFXyp6KZhOJmKjFOaFuwpkxVnHQ";

// Initialize Gemini models once for reuse
const genAI = new GoogleGenerativeAI(API_KEY);
const tools = [
    { googleSearch: {} },
  ];
  const config = {
    tools,
    responseMimeType: 'text/plain',
  };
const fastModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Helper: Get cached AI response
function getCachedAiResponse(key: string): string | null {
  const cached = aiResponseCache.get(key);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_EXPIRY_MS) {
    return cached.response;
  }
  return null;
}

// Helper: Cache AI response
function cacheAiResponse(key: string, response: string): void {
  aiResponseCache.set(key, { response, timestamp: Date.now() });
}

// Helper: Fetch schema for a specific table (optimized)
async function fetchTableSchema(connectionDetails: any, tableName: string): Promise<any> {
  const { database_type, host, database_name, username, password } = connectionDetails;

  if (database_type === "postgres") {
    const pgClient = await connectToPostgres({
      host,
      database: database_name,
      user: username,
      password,
    });
    const schema = await getPostgresColumnTypes(pgClient, tableName);
    await pgClient.end();
    return schema;
  } else if (database_type === "mysql") {
    const mysqlConnection = await connectToMySQL({
      host,
      database: database_name,
      user: username,
      password,
    });
    const schema = await getMySQLColumnTypes(mysqlConnection, tableName);
    await mysqlConnection.end();
    return schema;
  }
  return {};
}

// Helper: Generate AI response quickly
async function generateAiResponse(userQuery: string, tableName: string): Promise<string> {
  // Return simple, professional confirmation messages without calling AI
  const responseTemplates = [
    "Query executed successfully.",
    "Data retrieved successfully.",
    "Results generated successfully.",
    "Query completed successfully."
  ];
  
  // Select response based on query type
  const query = userQuery.toLowerCase();
  
  if (query.includes('count') || query.includes('total') || query.includes('sum')) {
    return "Calculation completed successfully.";
  } else if (query.includes('chart') || query.includes('graph') || query.includes('visualiz')) {
    return "Data prepared for visualization.";
  } else if (query.includes('filter') || query.includes('where') || query.includes('search')) {
    return "Data filtered successfully.";
  } else if (query.includes('group') || query.includes('aggregate')) {
    return "Data grouped and analyzed successfully.";
  } else {
    return responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
  }
}

// Helper: Fetch all table names for PostgreSQL
async function fetchPostgresTableNames(pgClient: any): Promise<string[]> {
  const res = await pgClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return res.rows.map((r: any) => r.table_name);
}

// Helper: Fetch all table names for MySQL
async function fetchMySQLTableNames(mysqlConnection: any): Promise<string[]> {
  const [rows] = await mysqlConnection.execute("SHOW TABLES");
  // Assuming the key for table name is the first key in each row object.
  return rows.map((row: any) => Object.values(row)[0]);
}

// Helper: Fetch schema for all tables in the database connection.
// This provides comprehensive database context to the AI for better SQL generation,
// query optimization, and explanations by understanding table relationships and structure.
async function fetchAllTableSchemas(connectionDetails: any): Promise<any> {
  const { database_type, host, database_name, username, password } =
    connectionDetails;
  let schemas: Record<string, any> = {};

  if (database_type === "postgres") {
    const pgClient = await connectToPostgres({
      host,
      database: database_name,
      user: username,
      password,
    });
    const tableNames = await fetchPostgresTableNames(pgClient);
    for (const table of tableNames) {
      // Get column types for each table
      const schema = await getPostgresColumnTypes(pgClient, table);
      schemas[table] = schema;
    }
    await pgClient.end();
  } else if (database_type === "mysql") {
    const mysqlConnection = await connectToMySQL({
      host,
      database: database_name,
      user: username,
      password,
    });
    const tableNames = await fetchMySQLTableNames(mysqlConnection);
    for (const table of tableNames) {
      const schema = await getMySQLColumnTypes(mysqlConnection, table);
      schemas[table] = schema;
    }
    await mysqlConnection.end();
  }  // Extend for MongoDB if needed.
  return schemas;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); // ---------- Inline Completion Mode ----------
    if (body.inlineCompletion === true) {
      const {
        connection_id,
        currentQuery,
        linePrefix,
        tables,
        columns,
        cursorPosition,
      } = body;

      if (!connection_id) {
        return NextResponse.json(
          { error: "Missing connection_id for inline completion." },
          { status: 400 }
        );
      }

      // Allow empty currentQuery for real-time completions
      if (!currentQuery && !linePrefix) {
        return NextResponse.json({ completion: "" }, { status: 200 });
      }
      try {
        console.log("🚀 Inline completion request:", {
          connection_id,
          currentQuery,
          linePrefix,
          tables: tables?.length,
          columns: columns?.length,
        });

        // Get connection details for better context
        let connectionDetails = getDbConnectionDetails(connection_id);
        if (!connectionDetails) {
          const { data, error } = await supabaseClient
            .from("database_connections")
            .select("database_type, host, database_name, username, password")
            .eq("id", connection_id)
            .single();
          if (error) {
            console.log("❌ Failed to get connection details:", error);
            return NextResponse.json({ completion: "" }, { status: 200 });
          }
          connectionDetails = data;
          setDbConnectionDetails(connection_id, connectionDetails);
        }

        // Enhanced prompt specifically for inline completions
        const completionPrompt = `You are an expert SQL inline completion assistant. Provide ONLY the next text to complete the SQL query.

CONTEXT:
- Database type: ${connectionDetails.database_type}
- Current query: "${currentQuery}"
- Line being typed: "${linePrefix}"
- Cursor position: ${cursorPosition}
- Available tables: [${tables?.join(", ") || "none"}]
- Available columns: [${columns?.join(", ") || "none"}]

RULES:
1. Return ONLY the completion text (no explanations, no backticks, no formatting)
2. If line ends with "FROM" → suggest table name only
3. If line ends with "SELECT" → suggest column names or "*"
4. If line ends with "WHERE" → suggest column name with operator
5. If line ends with "JOIN" → suggest table name
6. If typing partial table/column name → complete it
7. Keep completions SHORT (under 50 characters for inline)
8. NO newlines in inline completions
9. Return empty string if no good completion exists

Examples:
- Line: "SELECT * FROM" → Return: " users"
- Line: "SELECT" → Return: " id, name"
- Line: "WHERE" → Return: " id = "
- Line: "FROM use" → Return: "rs"

Current line: "${linePrefix}"
Complete with:`;
        
        const result = await fastModel.generateContent(completionPrompt);
        let completion = result.response.text().trim();

        // Clean up the completion for inline use
        completion = completion
          .replace(/^(complete|completion|suggestion|answer):\s*/i, "")
          .replace(/^`+|`+$/g, "")
          .replace(/^sql\s*/i, "")
          .replace(/^\s*→\s*/, "")
          .replace(/^\s*->\s*/, "")
          .replace(/^["']+|["']+$/g, "")
          .split("\n")[0] // Take only first line for inline
          .trim();

        console.log("✨ Cleaned completion:", completion);

        // Validate completion
        if (completion && completion.length > 0 && completion.length < 100) {
          console.log("✅ Returning completion:", completion);
          return NextResponse.json({ completion }, { status: 200 });
        }

        console.log("❌ Completion invalid or too long");
        return NextResponse.json({ completion: "" }, { status: 200 });
      } catch (error) {
        console.error("Inline completion error:", error);
        return NextResponse.json({ completion: "" }, { status: 200 });
      }
    } // ---------- Query Optimization Mode ----------
    if (body.optimizeQuery === true) {
      const { connection_id, sqlQuery } = body;

      if (!connection_id || !sqlQuery) {
        return NextResponse.json(
          { error: "Missing required parameters for query optimization." },
          { status: 400 }
        );
      }

      // Check cache first
      const queryHash = generateQueryHash(sqlQuery, "optimize", connection_id);
      const cachedOptimization = queryExplanationCache.get(queryHash);      if (
        cachedOptimization &&
        Date.now() - cachedOptimization.timestamp < EXPLANATION_CACHE_EXPIRY_MS
      ) {
        console.log("🎯 Returning cached optimization for query");
        return NextResponse.json(
          { sqlQuery: cachedOptimization.explanation },
          { status: 200 }
        );
      }      try {
        // Get full database schema for better optimization context
        const fullSchemaCacheKey = `full_schema_${connection_id}`;
        let fullDatabaseSchema = schemaCache.get(fullSchemaCacheKey);

        if (!fullDatabaseSchema) {
          let connectionDetails = getDbConnectionDetails(connection_id);
          if (!connectionDetails) {
            const { data, error } = await supabaseClient
              .from("database_connections")
              .select("database_type, host, database_name, username, password")
              .eq("id", connection_id)
              .single();
            if (error) {
              return NextResponse.json(
                { error: "Error fetching database details." },
                { status: 500 }
              );
            }
            setDbConnectionDetails(connection_id, data);
            connectionDetails = data;
          }

          try {
            fullDatabaseSchema = await fetchAllTableSchemas(connectionDetails);
            schemaCache.set(fullSchemaCacheKey, fullDatabaseSchema);
          } catch (schemaError) {
            console.error("Schema fetch error for optimization:", schemaError);
            // Continue without schema context if fetch fails
            fullDatabaseSchema = {};
          }
        }        // Create schema context string for optimization
        const schemaContext = Object.keys(fullDatabaseSchema).length > 0
          ? `\n\nDATABASE SCHEMA CONTEXT:\n${Object.entries(fullDatabaseSchema).map(([table, schema]) => 
              `${table}: ${schema && typeof schema === 'object' ? Object.keys(schema).join(', ') : 'unknown'}`
            ).join('\n')}\n\nUse this schema knowledge to suggest better joins, proper table relationships, and optimal column selection.`
          : '';

        const optimizationPrompt = `You are a senior database performance engineer. Optimize this SQL query for better performance, readability, and maintainability.${schemaContext}

OPTIMIZATION OBJECTIVES:
1. Improve query performance (indexing hints, join optimization, subquery elimination)
2. Enhance readability (proper formatting, meaningful aliases)
3. Remove redundant operations (unnecessary CAST, duplicate conditions)
4. Optimize data retrieval (appropriate column selection, efficient filtering)

STRICT OUTPUT REQUIREMENTS:
- Return ONLY the optimized SQL query
- NO explanations, comments, or additional text
- Ensure proper SQL syntax and formatting
- Must end with a semicolon
- Use consistent indentation and formatting
- Preserve original functionality while improving performance

FORMATTING RULES:
- Use proper indentation (2 spaces)
- Capitalize SQL keywords (SELECT, FROM, WHERE, etc.)
- Use meaningful table aliases where beneficial
- Place each major clause on a new line
- Align column names in SELECT statements

Original Query:
${sqlQuery}

Optimized Query:`;

        const result = await fastModel.generateContent(optimizationPrompt);
        let optimizedQuery = result.response.text().trim();

        // Enhanced cleaning process for optimization responses
        optimizedQuery = optimizedQuery
          // Remove code blocks
          .replace(/^```sql\s*/gim, "")
          .replace(/^```\s*/gm, "")
          .replace(/\s*```$/gm, "")
          // Remove common AI response prefixes
          .replace(
            /^(optimized query|here.{0,20}optimized|result|answer):\s*/gim,
            ""
          )
          .replace(
            /^(the optimized query is|here is the|below is the).*?:\s*/gim,
            ""
          )
          // Clean up whitespace
          .trim();

        // Find the actual SQL query (start from SELECT/WITH/INSERT/UPDATE/DELETE)
        const sqlStartPattern =
          /\b(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE)\b/i;
        const sqlMatch = optimizedQuery.match(sqlStartPattern);
        if (sqlMatch) {
          const startIndex = optimizedQuery.indexOf(sqlMatch[0]);
          optimizedQuery = optimizedQuery.substring(startIndex);
        }

        // Ensure single semicolon at end
        optimizedQuery = optimizedQuery.replace(/;+$/, "") + ";";

        // Final validation - ensure it's actually SQL
        const hasBasicSqlStructure =
          /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\b(FROM|INTO|SET|WHERE)\b/i.test(
            optimizedQuery
          );
        if (
          !optimizedQuery ||
          optimizedQuery.length < 15 ||
          !hasBasicSqlStructure
        ) {
          console.log(
            "Generated optimized query failed validation, returning original"
          );
          return NextResponse.json(
            {
              sqlQuery: body.sqlQuery,
              message:
                "Optimization could not be completed. Please check your query syntax.",
            },
            { status: 200 }
          );
        }

        // Cache the optimized query
        queryExplanationCache.set(queryHash, {
          explanation: optimizedQuery,
          timestamp: Date.now(),
          type: "optimize",
        });

        return NextResponse.json(
          { message: optimizedQuery },
          { status: 200 }
        );
      } catch (error) {
        console.error("Query optimization error:", error);
        return NextResponse.json(
          { error: "Failed to optimize query." },
          { status: 500 }
        );
      }
    }

    // Debug cache endpoint
    if (body.debugCache) {
      return NextResponse.json({
        explanationCacheSize: queryExplanationCache.size,
        aiResponseCacheSize: aiResponseCache.size,
        explanationCacheKeys: Array.from(queryExplanationCache.keys()).map(key => ({
          key: key.slice(-16),
          age: Date.now() - (queryExplanationCache.get(key)?.timestamp || 0),
          type: queryExplanationCache.get(key)?.type
        })),
        cacheExpiry: EXPLANATION_CACHE_EXPIRY_MS
      });
    }

    // Clear cache endpoint
    if (body.clearCache) {
      queryExplanationCache.clear();
      aiResponseCache.clear();
      return NextResponse.json({ message: "Cache cleared successfully" });
    }

    // Explain Query
    if (body.explainQuery) {
      const { connection_id, sqlQuery } = body;

      if (!connection_id || !sqlQuery) {
        return NextResponse.json(
          { error: "Missing required parameters for query explanation." },
          { status: 400 }
        );
      }      // Check cache first
      const queryHash = generateQueryHash(sqlQuery, "explain", connection_id);
      const cachedExplanation = queryExplanationCache.get(queryHash);
        console.log("🔍 Cache lookup:", { 
        queryHash: queryHash.slice(-16), 
        hasCached: !!cachedExplanation,
        cacheAge: cachedExplanation ? Date.now() - cachedExplanation.timestamp : 0,
        cacheExpiry: EXPLANATION_CACHE_EXPIRY_MS,
        isExpired: cachedExplanation ? Date.now() - cachedExplanation.timestamp >= EXPLANATION_CACHE_EXPIRY_MS : false
      });
      
      if (
        cachedExplanation &&
        Date.now() - cachedExplanation.timestamp < EXPLANATION_CACHE_EXPIRY_MS
      ) {
        console.log("🎯 Returning cached explanation for query");
        try {
          // Try to parse as new format
          const parsedExplanation = JSON.parse(cachedExplanation.explanation);
          return NextResponse.json(
            { 
              explanation: parsedExplanation.detailed || parsedExplanation.full,
              conciseExplanation: parsedExplanation.concise,
              detailedExplanation: parsedExplanation.detailed || parsedExplanation.full,
              explanations: parsedExplanation
            },
            { status: 200 }
          );
        } catch {
          // Fallback for old format
          return NextResponse.json(
            { 
              explanation: cachedExplanation.explanation,
              conciseExplanation: cachedExplanation.explanation,
              detailedExplanation: cachedExplanation.explanation
            },
            { status: 200 }
          );
        }
      }      try {
        // Get full database schema for better explanation context
        const fullSchemaCacheKey = `full_schema_${connection_id}`;
        let fullDatabaseSchema = schemaCache.get(fullSchemaCacheKey);

        if (!fullDatabaseSchema) {
          let connectionDetails = getDbConnectionDetails(connection_id);
          if (!connectionDetails) {
            const { data, error } = await supabaseClient
              .from("database_connections")
              .select("database_type, host, database_name, username, password")
              .eq("id", connection_id)
              .single();
            if (error) {
              console.log("Warning: Could not fetch connection details for explanation context");
              fullDatabaseSchema = {};
            } else {
              setDbConnectionDetails(connection_id, data);
              connectionDetails = data;
              
              try {
                fullDatabaseSchema = await fetchAllTableSchemas(connectionDetails);
                schemaCache.set(fullSchemaCacheKey, fullDatabaseSchema);
              } catch (schemaError) {
                console.log("Warning: Could not fetch schema for explanation context");
                fullDatabaseSchema = {};
              }
            }
          } else {
            try {
              fullDatabaseSchema = await fetchAllTableSchemas(connectionDetails);
              schemaCache.set(fullSchemaCacheKey, fullDatabaseSchema);
            } catch (schemaError) {
              console.log("Warning: Could not fetch schema for explanation context");
              fullDatabaseSchema = {};
            }
          }
        }

        // Create schema context for better explanations
        const schemaContext = Object.keys(fullDatabaseSchema).length > 0
          ? `\n\nSchema context (use for table/column understanding):\n${Object.entries(fullDatabaseSchema).map(([table, schema]) => 
              `${table}: ${schema && typeof schema === 'object' ? Object.keys(schema).join(', ') : 'unknown'}`
            ).join('\n')}\n`
          : '';

        // Generate both concise and detailed explanations in parallel for speed
        const [conciseResult, detailedResult] = await Promise.all([
          // Concise explanation (1-2 sentences)
          fastModel.generateContent(`Explain this SQL query in 1-2 simple sentences. What does it do?${schemaContext}

SQL: ${sqlQuery}

Brief explanation:`),
          
          // Detailed explanation (structured but still concise)
          fastModel.generateContent(`Explain this SQL query with simple structure:${schemaContext}

SQL: ${sqlQuery}

Format:
## Purpose
[1 sentence what it does]

## Key Components  
[2-3 bullet points of main parts]

## Results
[1 sentence what data it returns]

Simple explanation:`)
        ]);

        const conciseExplanation = conciseResult.response.text().trim();
        const detailedExplanation = detailedResult.response.text().trim();

        // Combine both explanations for the frontend
        const combinedExplanation = {
          concise: conciseExplanation,
          detailed: detailedExplanation,
          // For backward compatibility, use detailed as default
          full: detailedExplanation
        };        // Cache the combined explanation
        queryExplanationCache.set(queryHash, {
          explanation: JSON.stringify(combinedExplanation),
          timestamp: Date.now(),
          type: "explain",
        });
        
        console.log("💾 Cached explanation:", { 
          queryHash: queryHash.slice(-16), 
          cacheSize: queryExplanationCache.size,
          timestamp: Date.now()
        });

        return NextResponse.json({ 
          explanation: detailedExplanation, // For backward compatibility
          conciseExplanation,
          detailedExplanation,
          explanations: combinedExplanation
        }, { status: 200 });
      } catch (error) {
        console.error("Query explanation error:", error);
        return NextResponse.json(
          {
            explanation: "This query retrieves data from your database based on the specified conditions.",
            conciseExplanation: "This query gets data from your database.",
            detailedExplanation: "## Purpose\nThis query retrieves data from your database.\n\n## Key Components\n• Selects specific columns\n• Applies filtering conditions\n\n## Results\nReturns filtered database records."
          },
          { status: 200 }
        );
      }
    }

    // ---------- Learn Schema Mode ----------
    if (body.learnSchema === true) {
      const { connection_id } = body;
      if (!connection_id) {
        return NextResponse.json(
          { error: "Missing connection_id for schema learning." },
          { status: 400 }
        );
      }

      try {
        // Get connection details from cache or Supabase
        let connectionDetails = getDbConnectionDetails(connection_id);
        if (!connectionDetails) {
          const { data, error } = await supabaseClient
            .from("database_connections")
            .select("database_type, host, database_name, username, password")
            .eq("id", connection_id)
            .single();
          if (error) {
            return NextResponse.json(
              { error: "Error fetching database details." },
              { status: 500 }
            );
          }
          connectionDetails = data;
          setDbConnectionDetails(connection_id, connectionDetails);
        }        // Check cache first for faster response
        const schemaCacheKey = `${connection_id}_all_tables`;
        let allSchemas = schemaCache.get(schemaCacheKey);
        
        if (!allSchemas) {
          // Fetch schemas for all tables
          allSchemas = await fetchAllTableSchemas(connectionDetails);
          schemaCache.set(schemaCacheKey, allSchemas);
        }
        
        // Generate AI response for successful schema learning using faster method
        let aiResponse = `Database schema loaded successfully! Found ${Object.keys(allSchemas).length} tables. You can now ask questions about your data.`;
        try {
          const prompt = `Brief confirmation: ${Object.keys(allSchemas).length} tables loaded from ${connectionDetails.database_type} database. 1 sentence.`;
          const result = await fastModel.generateContent(prompt);
          aiResponse = result.response.text().trim();
        } catch (responseError) {
          console.error("Error generating schema load response:", responseError);
          // Keep the default response if AI generation fails
        }
        
        return NextResponse.json({ 
          schemas: allSchemas, 
          aiResponse 
        }, { status: 200 });} catch (schemaError) {
        console.error("Schema learning error:", schemaError);
          // Generate AI error response for schema learning failure using faster method
        let aiErrorResponse = "Failed to load database schema. Please check your connection.";
        try {
          const prompt = `Brief error: Database schema loading failed. 1 sentence help.`;
          const result = await fastModel.generateContent(prompt);
          aiErrorResponse = result.response.text().trim();
        } catch (responseError) {
          console.error("Error generating schema error response:", responseError);
          // Keep the default response if AI generation fails
        }
        
        return NextResponse.json(
          {
            error: "Failed to learn database schema. Please check your connection.",
            aiResponse: aiErrorResponse
          },
          { status: 500 }
        );
      }    }    // ---------- Summarization Mode ----------
    if (body.summarize === true) {
      const { originalQuery, queryData, userQuery, connection_id, tableName, dataPreview, columns, rowCount, sqlQuery, userName } = body;
      
      // Support both old format (originalQuery, queryData) and new format (detailed parameters)
      let dataToAnalyze, queryToReference, userContext;
      
      if (dataPreview && columns && rowCount) {
        // New format from explain data functionality
        dataToAnalyze = dataPreview;
        queryToReference = sqlQuery || originalQuery;
        userContext = userQuery;
      } else if (originalQuery && queryData) {
        // Old format for backward compatibility
        dataToAnalyze = queryData;
        queryToReference = originalQuery;
        userContext = "Data analysis request";
      } else {
        return NextResponse.json(
          { error: "Missing required parameters for summarization." },
          { status: 400 }
        );
      }

      // Add caching for summarization to speed up repeated requests
      const summaryHash = generateQueryHash(
        `${queryToReference}_${JSON.stringify(dataToAnalyze).slice(0, 100)}_${userName}`, 
        "summarize", 
        connection_id
      );
      const cachedSummary = queryExplanationCache.get(summaryHash);

      if (
        cachedSummary &&
        Date.now() - cachedSummary.timestamp < AI_CACHE_EXPIRY_MS
      ) {
        return NextResponse.json({ explanation: cachedSummary.explanation }, { status: 200 });
      }

      // Calculate basic statistics from the data
      const dataStats = {
        totalRows: rowCount || dataToAnalyze.length,
        columns: columns || [],
        sampleData: dataToAnalyze
      };      // Enhanced prompt for concise data analysis
      const summaryPrompt = `${userName ? `Hi ${userName}! ` : ''}Analyze this data briefly and conversationally.

Query: ${queryToReference || "Database query"}
Records: ${dataStats.totalRows}
Sample: ${JSON.stringify(dataStats.sampleData, null, 2)}

Provide a CONCISE summary (2-3 sentences max):
1. What this data shows
2. Key numbers or patterns
3. One actionable insight

Keep it brief, conversational, and focused:`;      try {
        const result = await fastModel.generateContent(summaryPrompt);
        let summaryText = result.response.text().trim();
        
        // Clean any markdown formatting from the explanation
        summaryText = summaryText
          .replace(/^```[\w]*\s*/gm, "")  // Remove opening code blocks
          .replace(/\s*```$/gm, "")       // Remove closing code blocks
          .replace(/`([^`]+)`/g, "$1")    // Remove inline code formatting
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold formatting
          .replace(/\*(.*?)\*/g, "$1")    // Remove italic formatting
          .trim();
        
        // Cache the summary
        queryExplanationCache.set(summaryHash, {
          explanation: summaryText,
          timestamp: Date.now(),
          type: "explain",
        });
        
        return NextResponse.json({ explanation: summaryText }, { status: 200 });
      } catch (error) {
        console.error("Summarization error:", error);
        const fallbackMessage = userName 
          ? `Hi ${userName}! I found ${dataStats.totalRows} records in your query results. The data includes ${dataStats.columns.length} columns: ${dataStats.columns.slice(0, 3).join(', ')}${dataStats.columns.length > 3 ? ' and more' : ''}. Would you like me to help you visualize this data or run additional analysis?`
          : `Found ${dataStats.totalRows} records from your query with ${dataStats.columns.length} columns of data.`;
        
        return NextResponse.json({ 
          explanation: fallbackMessage
        }, { status: 200 });
      }
    }// Removed generateErrorResponse mode - errors are now handled directly with predefined messages

    // ---------- Generate Query Result Response Mode ----------
    if (body.generateQueryResult === true) {
      const { queryData, sqlQuery, userQuery, rowCount, tableName } = body;
      
      const resultPrompt = `Brief success: Found ${rowCount || "some"} results for "${userQuery}". 1 sentence confirmation.`;

      try {
        const result = await fastModel.generateContent(resultPrompt);
        const responseText = result.response.text().trim();
        return NextResponse.json({ response: responseText }, { status: 200 });
      } catch (error) {
        console.error("Error generating query result response:", error);
        return NextResponse.json(
          { response: "Query executed successfully." },
          { status: 200 }
        );
      }
    }// ---------- Suggestions Mode ----------
    if (body.suggestions === true) {
      const { connection_id, tableName } = body;
      if (!connection_id || !tableName) {
        return NextResponse.json(
          { error: "Missing required parameters for suggestions." },
          { status: 400 }
        );
      }

      try {
        // Get connection details with retry logic
        let connectionDetails = getDbConnectionDetails(connection_id);
        if (!connectionDetails) {
          const { data, error } = await supabaseClient
            .from("database_connections")
            .select("database_type, host, database_name, username, password")
            .eq("id", connection_id)
            .single();
          if (error) {
            console.error("Database connection details error:", error);
            return NextResponse.json(
              { error: "Error fetching database details." },
              { status: 500 }
            );
          }
          connectionDetails = data;
          setDbConnectionDetails(connection_id, connectionDetails);
        }

        // Fetch schemas for that specific table with fallback
        let allSchemas;
        try {
          allSchemas = await fetchAllTableSchemas(connectionDetails);
        } catch (schemaError) {
          console.error("Schema fetch error:", schemaError);
          // Return default suggestions if schema fetch fails
          const defaultSuggestions = [
            "Show me all data from this table",
            "Count the total number of records",
            "Display the first 10 rows",
            "Show me unique values in the first column",
          ];
          return NextResponse.json(
            { suggestions: defaultSuggestions },
            { status: 200 }
          );
        }

        const tableSchema = allSchemas[tableName]; // Generate practical query suggestions based on schema
        const suggestionPrompt = `
You are a distinguished SQL analyst with expertise in data exploration and business intelligence. Based on the database schema provided below, generate insightful and actionable query suggestions that help users explore their data effectively.
Return ONLY a JSON array of 4 concise, practical suggestions as strings, without any additional text or formatting.

Guidelines:
- Focus on practical business questions and data exploration
- Mix different analysis types: trends, summaries, comparisons, insights
- Keep suggestions conversational and natural (as if talking to data)
- Ensure suggestions can generate meaningful visualizations (bar, line, pie charts, tables)
- Vary complexity from simple queries to analytical insights
- Make suggestions specific to the actual data structure provided
- Always provide valid suggestions even if schema is incomplete

Table Schema:
${JSON.stringify(allSchemas, null, 2)}

Return format: ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]
      `;

        const conversationHistory = [
          { role: "system", content: suggestionPrompt },
        ];
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const formattedHistory = conversationHistory.map(
          (entry) => entry.content
        );
        let result;
        let retries = 3;

        // Retry logic for AI generation
        while (retries > 0) {
          try {
            result = await model.generateContent(formattedHistory);
            break;
          } catch (aiError) {
            console.error(
              `AI generation attempt failed (${4 - retries}/3):`,
              aiError
            );
            retries--;
            if (retries === 0) {
              // Return fallback suggestions if AI fails
              const fallbackSuggestions = [
                "Show me all records from the table",
                "Count total number of entries",
                "Display first 20 rows of data",
                "Show me the table structure",
              ];
              return NextResponse.json(
                { suggestions: fallbackSuggestions },
                { status: 200 }
              );
            }
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!result) {
          const fallbackSuggestions = [
            "Show me all records from the table",
            "Count total number of entries",
            "Display first 20 rows of data",
            "Show me the table structure",
          ];
          return NextResponse.json(
            { suggestions: fallbackSuggestions },
            { status: 200 }
          );
        }

        let suggestionsText = result.response.text().trim();

        // Remove markdown code fences if present
        suggestionsText = suggestionsText
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "")
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");

        try {
          const suggestions = JSON.parse(suggestionsText);

          // Validate suggestions array
          if (!Array.isArray(suggestions)) {
            throw new Error("Invalid suggestions format");
          }

          // Ensure we have valid string suggestions
          const validSuggestions = suggestions
            .filter((s) => typeof s === "string" && s.trim().length > 0)
            .slice(0, 6); // Limit to 6 suggestions

          if (validSuggestions.length === 0) {
            throw new Error("No valid suggestions generated");
          }

          return NextResponse.json(
            { suggestions: validSuggestions },
            { status: 200 }
          );
        } catch (parseError) {
          console.error(
            "Failed to parse suggestions:",
            parseError,
            "Raw text:",
            suggestionsText
          );

          // Try to extract suggestions from malformed JSON
          const lines = suggestionsText
            .split("\n")
            .filter(
              (line) =>
                line.trim() &&
                !line.includes("{") &&
                !line.includes("}") &&
                !line.includes("[") &&
                !line.includes("]")
            );

          if (lines.length > 0) {
            const extractedSuggestions = lines
              .map((line) => line.replace(/^[-*"'\s]+|[-*"'\s]+$/g, "").trim())
              .filter((s) => s.length > 10)
              .slice(0, 4);

            if (extractedSuggestions.length > 0) {
              return NextResponse.json(
                { suggestions: extractedSuggestions },
                { status: 200 }
              );
            }
          }

          // Ultimate fallback
          const ultimateFallback = [
            "Show me all the data",
            "Count the records",
            "Display recent entries",
            "Show data summary",
          ];
          return NextResponse.json(
            { suggestions: ultimateFallback },
            { status: 200 }
          );
        }
      } catch (error) {
        console.error("Suggestions generation error:", error);

        // Return safe fallback suggestions
        const safeFallback = [
          "Explore the database",
          "Show table contents",
          "Count all records",
          "Display data overview",
        ];
        return NextResponse.json(
          { suggestions: safeFallback },
          { status: 200 }
        );
      }    }    // ---------- SQL Generation Mode (Default) ----------
    const { connection_id, tableName, userQuery, userName } = body;
    if (!connection_id || !tableName || !userQuery) {
      return NextResponse.json(
        { error: "Missing required parameters for SQL generation." },
        { status: 400 }
      );
    }

    try {
      // Check for cached AI response first
      const aiCacheKey = `ai_${connection_id}_${tableName}_${userQuery}`;
      const cachedAiResponse = getCachedAiResponse(aiCacheKey);      // Enhanced schema fetching - get full database schema for better AI context
      const fullSchemaCacheKey = `full_schema_${connection_id}`;
      let fullDatabaseSchema = schemaCache.get(fullSchemaCacheKey);
      let primaryTableSchema = null;

      if (!fullDatabaseSchema) {
        let connectionDetails = getDbConnectionDetails(connection_id);
        if (!connectionDetails) {
          const { data, error } = await supabaseClient
            .from("database_connections")
            .select("database_type, host, database_name, username, password")
            .eq("id", connection_id)
            .single();
          if (error) {
            console.error("Database connection error:", error);
            return NextResponse.json(
              { error: "Error fetching database details." },
              { status: 500 }
            );
          }
          setDbConnectionDetails(connection_id, data);
          connectionDetails = data;
        }

        try {
          // Fetch full database schema for comprehensive AI context
          fullDatabaseSchema = await fetchAllTableSchemas(connectionDetails);
          schemaCache.set(fullSchemaCacheKey, fullDatabaseSchema);
          
          // Extract primary table schema for focused context
          primaryTableSchema = fullDatabaseSchema[tableName] || {};
        } catch (schemaError) {
          console.error("Schema fetch error for SQL generation:", schemaError);
          return NextResponse.json(
            {
              error:
                "Failed to fetch database schema. Please check your connection.",
            },
            { status: 500 }
          );
        }
      } else {
        // Extract primary table schema from cached full schema
        primaryTableSchema = fullDatabaseSchema[tableName] || {};
      }

      // Enhanced conversation cache with full database context
      const conversationKey = `${connection_id}_full_schema`;
      if (!conversationCache.has(conversationKey)) {
        // Create a more concise schema representation for the AI
        const schemaOverview = Object.keys(fullDatabaseSchema).map(table => {
          const columns = Object.keys(fullDatabaseSchema[table]);
          return `${table}(${columns.join(', ')})`;
        }).join(', ');        conversationCache.set(conversationKey, [
          {
            role: "system",
            content: `
You are an expert SQL developer and intelligent data assistant${userName ? ` speaking with ${userName}` : ''} specializing in writing simple, reliable, and executable SQL queries.

CORE RESPONSIBILITIES:
1. For data-related questions: Generate clean SQL queries and provide brief conversational responses
2. For non-data questions: Answer helpfully but redirect to data-focused queries
3. Always be professional, concise, conversational, and smart about context

RESPONSE DECISION LOGIC:
- IF user asks about data analysis, insights, or questions about the "${tableName}" table → Generate SQL query + brief response
- IF user asks non-data questions (weather, general knowledge, etc.) → Answer briefly + redirect to data queries
- NEVER generate SQL for non-data questions

SQL GENERATION RULES (CRITICAL):
- RETURN ONLY ONE SQL query as a single line of plain text
- ONLY return raw SQL query as plain text - no formatting, comments, or code blocks
- Do NOT include triple backticks (\`\`\`) or language markers (\`\`\`sql)
- Do NOT include escaped characters like \\n, \\t, or \\r
- Use correct table and column names from the provided schema
- Use only valid fields from the schema

SQL SIMPLICITY RULES:
- ❌ AVOID complex subqueries, especially nested ones in SELECT clauses or WHERE conditions
- ❌ AVOID complex CASE statements with multiple nested conditions
- ❌ AVOID complex functions like CONCAT with calculated percentages
- ❌ AVOID window functions unless absolutely necessary
- ❌ AVOID CTEs (Common Table Expressions) - use simple queries instead
- ✅ PREFER simple SELECT, FROM, WHERE, GROUP BY, ORDER BY structure
- ✅ If percentage calculation needed: use simple division (column/total)*100 AS percentage
- ✅ For totals, use separate simple queries rather than subqueries
- ✅ Keep calculations straightforward using basic arithmetic operators
- ✅ ALWAYS assign aliases to aggregate functions (COUNT(), AVG(), SUM()) and derived columns

PREFERRED QUERY EXAMPLES:
✅ GOOD: SELECT payment_mode, SUM(current_service_amount) AS total_amount FROM services GROUP BY payment_mode
✅ GOOD: SELECT customer_name, COUNT(*) AS order_count FROM orders WHERE status = 'completed' GROUP BY customer_name
✅ GOOD: SELECT AVG(price) AS average_price, category FROM products GROUP BY category ORDER BY average_price DESC

❌ AVOID: SELECT payment_mode, SUM(amount) AS total, CONCAT(ROUND((SUM(amount) / (SELECT SUM(amount) FROM table)) * 100, 2), '%') AS percentage FROM table GROUP BY payment_mode

DATABASE COMPATIBILITY:
- ❗ NEVER use STRFTIME() function (doesn't exist in MySQL/PostgreSQL)
- Use DATE_FORMAT, EXTRACT, or DATE_PART for date operations
- For JOINs, infer relationships from column names (user_id, customer_id, etc.)
- Use INNER JOINs unless unmatched data requested (then LEFT JOINs)
- Ensure queries work with both MySQL and PostgreSQL

RESPONSE FORMATS:
For data-related questions:
{
  "sqlQuery": "SELECT ...",
  "aiResponse": "${userName ? `Perfect, ${userName}! ` : ''}Data retrieved successfully."
}

For non-data questions:
{
  "aiResponse": "${userName ? `Hi ${userName}! ` : ''}[brief answer]. Let's focus on analyzing your ${tableName} data - what would you like to explore?"
}

CRITICAL: Keep aiResponse SHORT and conversational${userName ? ` (address ${userName} naturally)` : ''} - 3-8 words for data queries, friendly redirect for non-data

Primary table: ${tableName}
DATABASE SCHEMA:
${Object.entries(fullDatabaseSchema).map(([table, schema]) => 
  `${table}: ${JSON.stringify(schema)}`
).join('\n')}`
          }
        ]);
      }      const conversationHistory = conversationCache.get(conversationKey)!;
      
      // Add context about the primary table being queried if user doesn't specify
      const userQueryWithContext = userQuery.toLowerCase().includes(tableName.toLowerCase()) 
        ? userQuery 
        : `${userQuery} (focus on ${tableName} table)`;      conversationHistory.push({ role: "user", content: userQueryWithContext });

      // Generate response using the comprehensive system prompt
      const prompt = conversationHistory.map(msg => msg.content).join('\n\n');
      const result = await fastModel.generateContent(prompt);
      
      let responseText = result.response.text().trim();
      
      // Parse the JSON response
      let parsedResponse;
      try {
        // Extract JSON from response if it's wrapped in markdown
        const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                         responseText.match(/```\n?([\s\S]*?)\n?```/) ||
                         [null, responseText];
        
        const jsonText = jsonMatch[1] || responseText;
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        // Fallback response
        return NextResponse.json({
          aiResponse: "I'm here to help you analyze your data. Please ask questions about your " + tableName + " table or SQL queries."
        });
      }      // If AI decided this is a data question and provided SQL
      if (parsedResponse.sqlQuery) {
        const sqlQuery = parsedResponse.sqlQuery.trim().replace(/;$/, "");
        let aiResponse = parsedResponse.aiResponse || "Query generated successfully.";
        
        // Clean any markdown formatting from the AI response
        aiResponse = aiResponse
          .replace(/^```[\w]*\s*/gm, "")  // Remove opening code blocks
          .replace(/\s*```$/gm, "")       // Remove closing code blocks
          .replace(/`([^`]+)`/g, "$1")    // Remove inline code formatting
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold formatting
          .replace(/\*(.*?)\*/g, "$1")    // Remove italic formatting
          .trim();

        return NextResponse.json({
          sqlQuery: sqlQuery,
          aiResponse: aiResponse
        });
      }
      
      // If AI decided this is not a data question, return only AI response
      let aiResponse = parsedResponse.aiResponse || "I'm here to help you analyze your data. Please ask questions about your " + tableName + " table or SQL queries.";
      
      // Clean any markdown formatting from the AI response
      aiResponse = aiResponse
        .replace(/^```[\w]*\s*/gm, "")  // Remove opening code blocks
        .replace(/\s*```$/gm, "")       // Remove closing code blocks
        .replace(/`([^`]+)`/g, "$1")    // Remove inline code formatting
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold formatting
        .replace(/\*(.*?)\*/g, "$1")    // Remove italic formatting
        .trim();
      
      return NextResponse.json({
        aiResponse: aiResponse
      });
    } catch (error) {
      console.error("Error generating SQL query:", error);
      return NextResponse.json(
        { error: "Failed to generate SQL query. Please try again later." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Main API error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
