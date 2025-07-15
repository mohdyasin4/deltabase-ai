"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidePanelStore } from "@/store/sidePanelStates";
import { useShallow } from "zustand/shallow";
import { useStore } from "@/store/useStatesStore";
import { detectDatetimeColumns, formatRowData } from "@/utils/datetimeUtils";
import Lottie from "react-lottie";
import animationData from "@/public/lotties/animated-triangle.json";
import { Spotlight } from "./spotlight-new";
import { PlaceholdersAndVanishInput } from "./placeholder-and-vanish-input";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@heroui/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  X,
  Bot,
  RefreshCcw,
  Plus,
  ChartArea,
  Search,
  SquareTerminal,
  Sparkles,
  Brain,
  Database,
  Copy,
  ArrowRight,
  Send,
  Lightbulb,
  TrendingUp,
  FileText,
  Loader2,
  Clock,
  Shield,
  Code2,
  MessageSquare,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Star,
  Zap,
  Activity,
  Eye,
  Volume2,
  Settings,
  HelpCircle,
  BookOpen,
  Target,
  Users,
  Globe,
  MoreHorizontal,
  Play,
  Pause,
  RotateCcw,  CheckCircle,
  AlertCircle,
  Check,
} from "lucide-react";

// Enhanced types for modern AI functionality
interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  type?: "query" | "result" | "error" | "insight" | "sql" | "visualization" | "suggestion";
  metadata?: {
    executionTime?: number;
    sqlQuery?: string;
    dataSize?: number;
    chartType?: string;
    confidence?: number;
    tokens?: number;
    model?: string;
    queryResults?: any[];
    resultCount?: number;
  };
}

interface Suggestion {
  id: string;
  text: string;
  category: "analysis" | "visualization" | "query" | "insight" | "advanced";
  icon: React.ComponentType<{ className?: string }>;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime?: string;
  description?: string;
}

interface AISettings {
  voiceEnabled: boolean;
  autoExplain: boolean;
  smartSuggestions: boolean;
  responsiveness: number;
  model: "fast" | "balanced" | "accurate";
}

// Enhanced AI API integration with better error handling and progress tracking
const getAIResponse = async (
  userInput: string, 
  connectionId?: string, 
  tableName?: string,
  updateFunctions?: {
    setRows: (rows: any[]) => void;
    setColumns: (columns: string[]) => void;
    setSqlQuery: (query: string) => void;
    setQueryLoading?: (loading: boolean) => void;
  },
  onProgress?: (step: string, progress: number) => void
): Promise<{
  text: string;
  sqlQuery?: string;
  executionTime: number;
  confidence: number;
  queryResults?: any[];
  resultCount?: number;
}> => {
  const startTime = Date.now();
  
  try {
    // Step 1: Get AI-generated SQL query with progress tracking
    onProgress?.("Analyzing your question...", 20);
    
    const sqlResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection_id: connectionId,
        tableName: tableName || 'default_table',
        userQuery: userInput
      })
    });
    
    if (!sqlResponse.ok) {
      throw new Error('Failed to generate SQL query');
    }
    
    onProgress?.("Generating SQL query...", 50);
    const { sqlQuery } = await sqlResponse.json();
    
    // Step 2: Execute the SQL query if we have a connection
    let queryResults = null;
    let resultCount = 0;
    
    if (connectionId && sqlQuery) {
      onProgress?.("Executing query...", 70);
      
      // Set loading state for main table
      if (updateFunctions?.setQueryLoading) {
        updateFunctions.setQueryLoading(true);
      }
      
      try {
        const queryResponse = await fetch(`/api/database/${connectionId}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sqlQuery })
        });
          
        onProgress?.("Processing results...", 90);
        
        if (queryResponse.ok) {
          const queryData = await queryResponse.json();
          queryResults = queryData.queryResult || queryData.data || [];
          resultCount = queryResults.length;
          
          // Update the main data table with query results
          if (updateFunctions && queryResults.length > 0) {
            const columns = Object.keys(queryResults[0]);
            updateFunctions.setColumns(columns);
            updateFunctions.setRows(queryResults);
            updateFunctions.setSqlQuery(sqlQuery);
          }
        } else {
          const errorText = await queryResponse.text();
          console.error('Failed to execute query:', errorText);
        }
      } catch (queryError) {
        console.error('Error executing query:', queryError);
      } finally {
        // Clear loading state
        if (updateFunctions?.setQueryLoading) {
          updateFunctions.setQueryLoading(false);
        }
      }
    }
    
    onProgress?.("Finalizing response...", 100);
    const executionTime = Date.now() - startTime;
    
    // Generate enhanced response text based on results
    let responseText = `I've processed your query: "${userInput}".`;
    
    if (queryResults) {
      responseText += ` I generated and executed the SQL query successfully.`;
      
      if (resultCount > 0) {
        responseText += ` The query returned ${resultCount} row${resultCount !== 1 ? 's' : ''} of data.`;
        
        // Add insights about the data
        if (resultCount > 100) {
          responseText += ` This is a large dataset - you might want to add filters or limits for better visualization.`;
        } else if (resultCount === 0) {
          responseText += ` No data was found matching your criteria. You might want to adjust your filters.`;
        }
      } else {
        responseText += ` The query executed successfully but returned no results.`;
      }
    } else {
      if (!connectionId) {
        responseText += ` Connect to a database to execute this query and see the results.`;
      }
    }
    
    return {
      text: responseText,
      sqlQuery: sqlQuery,
      executionTime,
      confidence: Math.floor(Math.random() * 20) + 80, // Simulate confidence
      queryResults,
      resultCount
    };
  } catch (error) {
    console.error('Error getting AI response:', error);
    const executionTime = Date.now() - startTime;
    
    return {
      text: `I apologize, but I encountered an error processing your query: "${userInput}". Please try again or rephrase your question.`,
      executionTime,
      confidence: 0
    };
  }
};

// Enhanced suggestions API with better categorization
const getAISuggestions = async (connectionId?: string): Promise<Suggestion[]> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestions: true,
        connection_id: connectionId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch AI suggestions');
    }
    
    const data = await response.json();
    
    // Map API response to enhanced suggestion format
    if (data.suggestions && Array.isArray(data.suggestions)) {
      return data.suggestions.map((suggestion: any, index: number) => ({
        id: suggestion.id || `suggestion-${index}`,
        text: suggestion.text || suggestion,
        category: suggestion.category || "query",
        icon: getCategoryIcon(suggestion.category || "query"),
        difficulty: suggestion.difficulty || "intermediate",
        estimatedTime: suggestion.estimatedTime || "3-5 sec",
        description: suggestion.description || "AI-generated query suggestion"
      }));
    }
    
    return getDefaultSuggestions();
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    return getDefaultSuggestions();
  }
};

// Helper function to get appropriate icon for suggestion category
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "analysis":
      return TrendingUp;
    case "visualization":
      return ChartArea;
    case "query":
      return Database;
    case "insight":
      return Lightbulb;
    case "advanced":
      return Code2;
    default:
      return Database;
  }
};

// Default suggestions with enhanced metadata
const getDefaultSuggestions = (): Suggestion[] => [
  {
    id: "1",
    text: "Show me all tables in the database",
    category: "query",
    icon: Database,
    difficulty: "beginner",
    estimatedTime: "2-3 sec",
    description: "Get an overview of your database structure"
  },
  {
    id: "2", 
    text: "Create a sales trend visualization",
    category: "visualization",
    icon: ChartArea,
    difficulty: "intermediate", 
    estimatedTime: "5-10 sec",
    description: "Generate interactive charts from your data"
  },
  {
    id: "3",
    text: "Analyze customer behavior patterns",
    category: "analysis",
    icon: TrendingUp,
    difficulty: "advanced",
    estimatedTime: "10-15 sec", 
    description: "Deep dive into customer analytics and insights"
  },
  {
    id: "4",
    text: "Generate SQL for top 10 products",
    category: "query",
    icon: Code2,
    difficulty: "intermediate",
    estimatedTime: "3-5 sec",
    description: "Automatically create optimized database queries"
  },
  {
    id: "5",
    text: "Find data quality issues",
    category: "insight",
    icon: Lightbulb,
    difficulty: "advanced",
    estimatedTime: "15-20 sec",
    description: "Identify missing values, outliers, and inconsistencies"
  },
];

// Fallback simulation function for AI-generated SQL queries - keeping original for compatibility
const getAIResponseLegacy = (userInput: string): string => {
  const responses: { [key: string]: string } = {
    "show all customers": "SELECT * FROM customers;",
    "get total sales from orders": "SELECT SUM(total_amount) FROM orders;",
    "find top 5 products":
      "SELECT name FROM products ORDER BY sales DESC LIMIT 5;",
  };
  return responses[userInput.toLowerCase()] || "SELECT * FROM default_table;";
};

export function parseAggregateAndGroupBy(query: string): {
  aggregate?: string;
  aggColumn?: string;
  groupBy?: string[];
} {
  // Remove trailing semicolons and extra whitespace
  const cleanedQuery = query.trim().replace(/;$/, "");

  // Extract aggregate function using regex.
  const aggregateMatch = cleanedQuery.match(
    /(COUNT|SUM|AVG|MIN|MAX)\s*\((\*|[\w\.]+)\)/i
  );
  const aggregate = aggregateMatch
    ? aggregateMatch[1].toLowerCase()
    : undefined;
  // Extract the aggregated column if not '*'
  const aggColumn =
    aggregateMatch && aggregateMatch[2] !== "*" ? aggregateMatch[2] : undefined;

  // Extract GROUP BY clause.
  const groupByMatch = cleanedQuery.match(/GROUP BY\s+(.+?)(ORDER BY|$)/i);
  let groupBy: string[] = [];
  if (groupByMatch && groupByMatch[1]) {
    groupBy = groupByMatch[1]
      .split(",")
      .map((s) => s.trim())
      .map((col) => {
        const funcMatch = col.match(/(?:\w+\()?\s*([\w\.]+)(?:\))?/);
        return funcMatch ? funcMatch[1] : col;
      });
  }

  return { aggregate, aggColumn, groupBy };
}

// Modern Enhanced Welcome Screen with premium glass morphism design
const InitialScreen = ({
  suggestions,
  handleQuickAction,
  aiSettings,
  isExpanded,
}: {
  suggestions: Suggestion[];
  handleQuickAction: (query: string) => void;
  aiSettings: AISettings;
  isExpanded: boolean;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hero Section with Enhanced Animations */}
      <div className="px-6 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-8"
        >          <div className="relative inline-block mb-6">
            {/* Modern Minimal Hero Avatar */}
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="relative z-10"
              >
                <Sparkles className="w-8 h-8 text-blue-500" />
              </motion.div>                {/* Subtle floating mini sparkles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 dark:bg-blue-500 rounded-full opacity-40"
                  animate={{
                    x: [0, Math.cos(i * 120) * 15, 0],
                    y: [0, Math.sin(i * 120) * 15, 0],
                    opacity: [0.2, 0.6, 0.2],
                  }}
                  transition={{
                    duration: 6 + (i * 0.5),
                    repeat: Infinity,
                    delay: i * 0.8,
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                />
              ))}
            </motion.div>            {/* Clean status indicators */}
            <motion.div 
              className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-background"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Check className="w-2.5 h-2.5 text-white" />
            </motion.div>              {aiSettings.voiceEnabled && (
              <motion.div
                className="absolute -bottom-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Mic className="w-2.5 h-2.5 text-white" />
              </motion.div>
            )}
          </div>            <motion.h2 
            className="text-xl font-semibold text-foreground mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            AI Assistant
          </motion.h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Ask questions about your data in natural language and get instant insights with AI-powered analysis.
          </p>
        </motion.div>

        {/* Enhanced Suggestions with Search */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-4"
          >            {/* Clean Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search suggestions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border/50 bg-background/50 focus:bg-background focus:border-primary/50"
              />
            </div>
              
            {/* Enhanced Suggestions with Modern Design */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              <AnimatePresence>
                {filteredSuggestions.slice(0, 4).map((suggestion, index) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <SuggestionCard
                      suggestion={suggestion}
                      onClick={() => handleQuickAction(suggestion.text)}
                      isExpanded={isExpanded}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredSuggestions.length === 0 && searchQuery && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No suggestions found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                </motion.div>
              )}
            </div>          </motion.div>
        )}
      </div>
      
      {/* Remove Feature Highlights section completely */}
    </div>
  );
};

// Enhanced Suggestion Component with modern interactions
const SuggestionCard = ({
  suggestion,
  onClick,
  isExpanded = false,
}: {
  suggestion: Suggestion;
  onClick: () => void;
  isExpanded?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group w-full text-left p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:border-border transition-all duration-200 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3 relative z-10">        <motion.div 
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
            suggestion.difficulty === "beginner" && "bg-green-100 dark:bg-green-950/30",
            suggestion.difficulty === "intermediate" && "bg-yellow-100 dark:bg-yellow-950/30",
            suggestion.difficulty === "advanced" && "bg-red-100 dark:bg-red-950/30"
          )}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        ><motion.div
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <suggestion.icon className={cn(
              "w-4 h-4 transition-colors duration-200",
              suggestion.difficulty === "beginner" && "text-emerald-600 dark:text-emerald-400",
              suggestion.difficulty === "intermediate" && "text-amber-600 dark:text-amber-400",
              suggestion.difficulty === "advanced" && "text-rose-600 dark:text-rose-400"
            )} />
          </motion.div>
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <motion.h4 
              className="text-sm font-semibold text-foreground group-hover:text-primary transition-all duration-300"
              animate={{
                x: isHovered ? 2 : 0,
              }}
            >
              {suggestion.text}
            </motion.h4>
            <motion.div
              animate={{
                x: isHovered ? 4 : 0,
                scale: isHovered ? 1.1 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-300 flex-shrink-0" />
            </motion.div>
          </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Badge variant="outline" className="text-xs capitalize border-border/40 bg-muted/20">
              {suggestion.category}
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs capitalize",
                suggestion.difficulty === "beginner" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                suggestion.difficulty === "intermediate" && "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
                suggestion.difficulty === "advanced" && "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
              )}
            >
              {suggestion.difficulty}
            </Badge>
            {suggestion.estimatedTime && (
              <motion.span 
                className="flex items-center gap-1 group-hover:text-foreground transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
              >
                <Clock className="w-3 h-3" />
                <span className="font-medium">{suggestion.estimatedTime}</span>
              </motion.span>
            )}
          </div>
          
          {isExpanded && suggestion.description && (
            <motion.p 
              className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
            >
              {suggestion.description}
            </motion.p>          )}
          
          {/* Simple hover indicator */}
          <motion.div
            className="absolute left-0 top-0 w-1 bg-primary rounded-r-sm"
            initial={{ height: 0 }}
            animate={{ height: isHovered ? "100%" : 0 }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>
    </motion.button>
  );
};

// Enhanced Message Component with AI features
const MessageComponent = ({
  message,
  isLatest,
  onAction,
  aiSettings,
}: {
  message: Message;
  isLatest: boolean;
  onAction: (action: string) => void;
  aiSettings: AISettings;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isAI = message.sender === "ai";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "group relative max-w-[90%] mb-4",
        isAI ? "self-start" : "self-end"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >      <div className={cn(
        "relative rounded-xl px-4 py-3 shadow-sm backdrop-blur-sm border max-w-prose",
        isAI 
          ? "bg-card/80 border-border/30 text-card-foreground" 
          : "bg-primary/90 text-primary-foreground ml-auto border-primary/20"
      )}>
        {isAI && (
          <div className="flex items-start gap-3">
            <motion.div
              className="relative flex-shrink-0"
              animate={{
                scale: message.type === "insight" ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 2, repeat: message.type === "insight" ? Infinity : 0 }}
            >              <Avatar className="w-6 h-6 mt-0.5">
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium border border-border/30">
                  AI
                </AvatarFallback>
              </Avatar>              {message.type === "insight" && (
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-1 h-1 bg-white rounded-full" />
                </motion.div>
              )}
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {message.type && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {message.type === "insight" && <Lightbulb className="w-3 h-3 mr-1" />}
                    {message.type === "result" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {message.type === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                    {message.type === "sql" && <Code2 className="w-3 h-3 mr-1" />}
                    {message.type}
                  </Badge>
                )}
                {message.metadata?.confidence && (
                  <Badge variant="secondary" className="text-xs">
                    {message.metadata.confidence}% confident
                  </Badge>
                )}
              </div>
              
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.text}
              </p>
                
              {message.metadata && (
                <motion.div 
                  className="mt-3 flex flex-wrap gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {message.metadata.executionTime && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {message.metadata.executionTime}ms
                    </Badge>
                  )}
                  {message.metadata.resultCount !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      <Database className="w-3 h-3 mr-1" />
                      {message.metadata.resultCount} rows
                    </Badge>
                  )}
                  {message.metadata.chartType && (
                    <Badge variant="secondary" className="text-xs">
                      <ChartArea className="w-3 h-3 mr-1" />
                      {message.metadata.chartType}
                    </Badge>
                  )}
                  {message.metadata.model && (
                    <Badge variant="outline" className="text-xs">
                      <Brain className="w-3 h-3 mr-1" />
                      {message.metadata.model}
                    </Badge>
                  )}
                </motion.div>
              )}
              
              {/* SQL Query Display */}
              {message.metadata?.sqlQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3 border border-border/30 rounded-lg overflow-hidden bg-muted/10"
                >
                  <div className="px-3 py-2 bg-muted/20 border-b border-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Generated SQL</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(message.metadata?.sqlQuery || "");
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="px-3 py-2">
                    <code className="text-xs font-mono text-foreground/80 break-all">
                      {message.metadata.sqlQuery}
                    </code>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
        
        {!isAI && (
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>            <Avatar className="w-6 h-6 mt-0.5 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500/80 to-emerald-600 text-white text-xs font-medium">
                U
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        
        {/* Enhanced Action buttons for AI messages */}
        {isAI && isLatest && message.text.includes("processed") && isHovered && (          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute -bottom-2 right-2 flex items-center gap-1 bg-background/95 border border-border/50 rounded-lg p-1 shadow-lg backdrop-blur-sm"
          >            <Tooltip content="Create visualization">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction("visualize")}
                className="h-6 w-6 p-0 hover:bg-accent rounded-md"
              >
                <ChartArea className="w-3 h-3" />
              </Button>
            </Tooltip>
            <Tooltip content="View SQL query">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction("sql")}
                className="h-6 w-6 p-0 hover:bg-accent rounded-md"
              >
                <Code2 className="w-3 h-3" />
              </Button>
            </Tooltip>
            <Tooltip content="Explain insights">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction("explain")}
                className="h-6 w-6 p-0 hover:bg-accent rounded-md"
              >
                <Brain className="w-3 h-3" />
              </Button>
            </Tooltip>
            {aiSettings.voiceEnabled && (
              <Tooltip content="Read aloud">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction("speak")}
                  className="h-6 w-6 p-0 hover:bg-accent rounded-md"
                >
                  <Volume2 className="w-3 h-3" />
                </Button>
              </Tooltip>
            )}
          </motion.div>
        )}
      </div>
      
      {/* Message timestamp */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        className={cn(
          "text-xs text-muted-foreground mt-1 px-2",
          isAI ? "text-left" : "text-right"
        )}
      >
        {message.timestamp.toLocaleTimeString()}
      </motion.div>
    </motion.div>  );
};

export default function AISidePanel() {
  const {
    isAiSidePanelOpen,
    setIsAiSidePanelOpen,
    showSidePanel,
    setShowSidePanel,
  } = useSidePanelStore(
    useShallow((state) => ({
      isAiSidePanelOpen: state.isAiSidePanelOpen,
      setIsAiSidePanelOpen: state.setIsAiSidePanelOpen,
      showSidePanel: state.showSidePanel,
      setShowSidePanel: state.setShowSidePanel,
    }))
  );
  const { connection_id, tableName, setActiveTab, executionTime, setExecutionTime } = useStore(
    useShallow((state) => ({
      connection_id: state.connection_id,
      tableName: state.tableName,
      setActiveTab: state.setActiveTab,
      executionTime: state.executionTime,
      setExecutionTime: state.setExecutionTime,
    }))
  );
  const {
    allColumns,
    setColumns,
    setAllColumns,
    setSelectedAggregate,
    setSelectedValues,
    setGroupByValue,
    setPrimaryKeys,
    setSqlAiQuery,
    setSqlQuery,
    setColumnTypes,
    datetimeColumns,
    setDatetimeColumns,
    setXAxis,
    setYAxis,
    setRows,
    setRawRows,
    setData,
    setSelectedVisualization, // New setter for visualization type
  } = useStore();

  // Chat state
  const [messages, setMessages] = useState<
    { sender: "user" | "ai"; text: string }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chatHistory, setChatHistory] = useState<
    { sender: "user" | "ai"; text: string }[]
  >([]);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [isConsent, setIsConsent] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(
    null
  );
  const latestUserQueryRef = useRef<string>("");

  const pathname = usePathname();

  // Close aside panel when pathname changes
  useEffect(() => {
    setIsAiSidePanelOpen(false);
  }, [pathname]);


  // Fetch dynamic suggestions based on table schema

  async function fetchSuggestions() {
    if (!connection_id || !tableName) return;
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestions: true,
          connection_id,
          tableName,
        }),
      });
      if (response.ok) {
        const data = await response.json();        if (data.suggestions && Array.isArray(data.suggestions)) {
          // Convert string suggestions to Suggestion objects
          const convertedSuggestions: Suggestion[] = data.suggestions.map((suggestion: any, index: number) => ({
            id: `suggestion-${index}`,
            text: typeof suggestion === 'string' ? suggestion : suggestion.text || suggestion,
            category: "query" as const,
            icon: Database,
            difficulty: "intermediate" as const,
            estimatedTime: "3-5 sec",
            description: "AI-generated query suggestion"
          }));
          setSuggestions(convertedSuggestions);
        } else {
          console.error("Unexpected suggestions format:", data);
        }
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  }

  useEffect(() => {
    fetchSuggestions();
  }, [connection_id, tableName]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Main submission handler
  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    await processQuery(inputValue.trim());
  };

  // Handler for quick action buttons
  const handleQuickAction = async (query: string) => {
    setInputValue(query);
    await processQuery(query);
  };

  const handleNewChat = () => {
    setChatHistory([]);
    setMessages([]);
    fetchSuggestions();
    setInputValue("");
  };
  
  const handleRegenerate = async () => {
    const lastUserMsg = chatHistory
      .filter((msg) => msg.sender === "user")
      .pop();
    if (lastUserMsg) {
      await processQuery(lastUserMsg.text);
    }
  };

  // Standard visualization determination logic (fallback).
  const determineVisualizationType = (
  rows: any[],
  userQuery: string = "",
  datetimeCols: string[] = []
): "table" | "number" | "bar" | "line" | "area" | "pie" => {
  // First, check if the userQuery explicitly mentions a chart type.
  const lowerQuery = userQuery.toLowerCase();
  if (lowerQuery.includes("bar")) return "bar";
  if (lowerQuery.includes("pie")) return "pie";
  if (lowerQuery.includes("area")) return "area";
  if (lowerQuery.includes("line")) return "line";
  if (lowerQuery.includes("table")) return "table";
  if (lowerQuery.includes("number") || lowerQuery.includes("numerical")) return "number";

  // Fallback based on data characteristics.
  if (!rows || rows.length === 0) return "table";
  const keys = Object.keys(rows[0]);
  if (rows.length === 1 && keys.length === 1) return "number";
  const numericKeys = keys.filter((key) =>
    rows.every((row) => typeof row[key] === "number")
  );
  
  // If datetime columns are detected, default to line chart
  if (datetimeCols && datetimeCols.length > 0) return "line";
  
  // If we have numeric data, default to bar chart
  if (numericKeys.length > 0) return "bar";

  // Otherwise, fallback to table
  return "table";
};

  // Helper to check for explicit visualization directives.
  // It looks for phrases like "switch to {chart type} chart" or "show me data as {chart type}".
  const checkVisualizationSwitch = (
    query: string
  ): "table" | "bar" | "line" | "area" | "pie" | "number" | null => {
    const lower = query.toLowerCase();
    // Regular expressions for our patterns.
    const switchRegex = /switch to\s+(\w+)\s+(?:chart)?/i;
    const showRegex = /show me data as\s+(\w+)/i;
    let match = query.match(switchRegex) || query.match(showRegex);
    if (match && match[1]) {
      const type = match[1].toLowerCase();
      // Map common words to our visualization types.
      if (["table"].includes(type)) return "table";
      if (["bar"].includes(type)) return "bar";
      if (["line"].includes(type)) return "line";
      if (["area"].includes(type)) return "area";
      if (["pie"].includes(type)) return "pie";
      if (["number", "numerical", "num"].includes(type)) return "number";
    }
    return null;
  };

  const getVisualizationType = (
    userQuery: string,
    rows: any[],
    datetimeCols: string[]
  ): "table" | "number" | "bar" | "line" | "area" | "pie" => {
    console.log("User query:", userQuery);
    console.log("Rows:", rows);
    console.log("Datetime columns:", datetimeCols);
    const explicit = checkVisualizationSwitch(userQuery);
    if (explicit) return explicit;
    return determineVisualizationType(rows, userQuery, datetimeCols);
  };

  // If explicit directive is found, switch visualization immediately.
  const processVisualizationSwitch = (userQuery: string): boolean => {
    const explicitViz = checkVisualizationSwitch(userQuery);
    if (explicitViz) {
      setSelectedVisualization(explicitViz);
      setMessages((prev) => [...prev, { sender: "user", text: userQuery }]);
      setChatHistory((prev) => [
        ...prev,
        { sender: "user", text: userQuery },
        { sender: "ai", text: `Visualization switched to "${explicitViz}".` },
      ]);
      setIsLoading(false);
      setInputValue("");
      return true;
    }
    return false;
  };

  // Core processing function.
  const processQuery = async (userQuery: string) => {
    latestUserQueryRef.current = userQuery;

    // First, check for explicit visualization switch (only if user query contains "switch to" or "show me data as")
    if (processVisualizationSwitch(userQuery)) {
      return;
    }

    setXAxis("");
    setYAxis([]);
    setDatetimeColumns([])
    // Otherwise, proceed with the normal query processing.
    setMessages((prev) => [...prev, { sender: "user", text: userQuery }]);
    setChatHistory((prev) => [...prev, { sender: "user", text: userQuery }]);
    setIsLoading(true);

    try {
      // STEP 1: Get AI-generated SQL query.
      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id, tableName, userQuery }),
      });
      if (!geminiResponse.ok) throw new Error("Failed to generate SQL query.");
      const geminiData = await geminiResponse.json();
      let sqlQuery = geminiData.sqlQuery || getAIResponse(userQuery);
      sqlQuery = sqlQuery.trim().replace(/;$/, "");
      setGeneratedSql(sqlQuery);

      // STEP 2: Execute the SQL query on the database.
      const dbResponse = await fetch(`/api/database/${connection_id}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlQuery }),
      });
      
      if (!dbResponse.ok) throw new Error("Failed to fetch query results.");
      const dbData = await dbResponse.json();
      if (dbData.error) throw new Error(dbData.error);
      const { columnTypes = [], queryResult = [], primaryKeys = [], queryExecutionTime } = dbData;
      
      setExecutionTime(queryExecutionTime);
      if (!Array.isArray(queryResult) || queryResult.length === 0)
        throw new Error("No data returned from query.");

      // STEP 3: Process query results.
      const columns = queryResult.length > 0 ? Object.keys(queryResult[0]) : [];
      const datetimeCols = detectDatetimeColumns(queryResult);
      console.log("Query result:", queryResult);
      console.log("Detected datetime columns:", datetimeCols);
      setDatetimeColumns(datetimeCols);
      setQueryResult(queryResult);

      const formattedRows = queryResult.map((row: any) =>
        formatRowData(row, datetimeCols)
      );      // Update store states from parsed SQL query.
      const { aggregate, groupBy, aggColumn } =
        parseAggregateAndGroupBy(sqlQuery);
      console.log("Parsed SQL query:", { aggregate, groupBy, aggColumn });
      setSelectedAggregate(aggregate || null);
      setGroupByValue(groupBy || []);
      if (aggColumn) setSelectedValues([aggColumn]);
      setColumns(columns);
      if (allColumns.length === 0) setAllColumns(columns);
      setPrimaryKeys(primaryKeys[0]);
      setColumnTypes(columnTypes);
      setRows(formattedRows);
      setRawRows(queryResult);
      setSqlAiQuery(sqlQuery);
      setSqlQuery(sqlQuery);

      // Append a generic success message.
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Your query has been processed. Choose an action below.",
        },
      ]);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Your query has been processed. Choose an action below.",
        },
      ]);
    } catch (error: any) {
      console.error("Error processing query:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: error.message || "An error occurred." },
      ]);
    } finally {
      setIsLoading(false);
      setInputValue("");
    }
  };

  // Handler for the "Visualize" button.
  const handleVisualize = () => {
    const userQuery = latestUserQueryRef.current;

    const rows = Array.isArray(useStore.getState().rawRows)
      ? useStore.getState().rawRows
      : [];
    const vizType = getVisualizationType(userQuery, rows, datetimeColumns);
    setSelectedVisualization(vizType);
    setMessages((prev) => [
      ...prev,
      { sender: "ai", text: `Visualization switched to ${vizType}.` },
    ]);
  };

  const handleSqlQuery = () => {
    if (isAiSidePanelOpen) {
      setIsAiSidePanelOpen(false);
      setShowSidePanel(true);
      setActiveTab("sqlEditor");
    }
  };

  const handleExplainData = () => {
    setIsConsentOpen(true);
  };

  const handleConfirmExplain = async () => {
    setIsConsent(true);
    setIsConsentOpen(false);
    console.log("User consented – Proceed with sensitive data analysis");

    // Proceed with your logic directly without checking isConsent.
    if (!Array.isArray(queryResult) || queryResult.length === 0) {
      throw new Error("No data returned from query.");
    }
    const datetimeCols = detectDatetimeColumns(queryResult);
    setDatetimeColumns(datetimeCols);
    const formattedRows = queryResult.map((row: any) =>
      formatRowData(row, datetimeCols)
    );
    try {
      const summaryResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summarize: true,
          queryData: formattedRows.slice(0, 5),
          originalQuery: generatedSql,
        }),
      });
      if (!summaryResponse.ok) throw new Error("Failed to generate summary.");
      const summaryData = await summaryResponse.json();
      const finalSummary = summaryData?.text || "No summary available.";

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: finalSummary,
        },
      ]);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: finalSummary,
        },
      ]);
    } catch (error: any) {
      console.error("Error processing query:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: error.message || "An error occurred." },
      ]);
    }
  };
  
  // New: Handler to trigger learning the entire database schema
  const handleLearnSchema = async () => {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnSchema: true, connection_id }),
      });
      if (!response.ok) throw new Error("Failed to load database schema.");
      const result = await response.json();
      console.log("Learned schema:", result.schemas);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Database schema loaded successfully." },
      ]);
    } catch (error: any) {
      console.error("Error learning schema:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: error.message || "Failed to load database schema." },
      ]);
    }
  };
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
  };

  return (
    <AnimatePresence>
      {isAiSidePanelOpen && (
        <motion.div
          key="side-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ ease: "easeInOut", duration: 0.6 }}
          className="fixed right-0 top-0 h-screen w-[540px] bg-background/95 dark:bg-background/98 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute mt-12 left-0 w-full flex items-center justify-between px-6 py-4 bg-background/90 dark:bg-background/95 backdrop-blur-md border-b border-border/30 z-10"
          >
            <h1 className="text-lg font-semibold text-foreground">SQL AI Assistant</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 m-0 h-6 w-6"
                onClick={handleNewChat}
              >
                <RefreshCcw size={16} />
                <span className="sr-only">New Chat</span>
              </Button>  
              <Button
                variant="ghost"
                size="sm"
                className="p-0 m-0 h-6 w-6"
                onClick={handleLearnSchema}
              >
                <Plus size={16} />
                <span className="sr-only">Load Schema</span>
              </Button>              <Button
                variant="ghost"
                onClick={() => setIsAiSidePanelOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-accent p-2 m-0 h-8 w-8 transition"
              >
                <X size={24} />
              </Button>
            </div>
          </motion.div>

          {/* Chat Section */}            <div className="relative h-full flex flex-col justify-between text-foreground pt-16 overflow-y-auto">
            {messages.length === 0 ? (              <InitialScreen
                suggestions={suggestions}
                handleQuickAction={handleQuickAction}
                aiSettings={{
                  voiceEnabled: false,
                  autoExplain: true,
                  smartSuggestions: true,
                  responsiveness: 80,
                  model: "balanced"
                }}
                isExpanded={true}
              />
            ) : (
              <div className="px-6 mt-12 flex flex-col gap-2 overflow-auto pb-14">
                {messages.map((msg, index) => {
                  const isAIMessage = msg.sender === "ai";

                  const isActionMessage =
                    isAIMessage &&
                    msg.text ===
                      "Your query has been processed. Choose an action below.";
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative p-3 rounded-lg text-sm max-w-[85%] flex flex-col gap-2 ${
                        isAIMessage
                          ? "self-start bg-card/80 border border-border/30 text-card-foreground"
                          : "self-end bg-primary/90 text-primary-foreground border border-primary/20"
                      }`}
                      style={{ marginBottom: "1rem" }}
                      onMouseEnter={() => setHoveredMessageIndex(index)}
                      onMouseLeave={() => setHoveredMessageIndex(null)}
                    >
                      {/* AI or User Text */}
                      <div className="flex items-center gap-2">                        {isAIMessage && (
                          <div className="w-5 h-5 flex-shrink-0">
                            <Bot className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <span>{msg.text}</span>
                      </div>

                      {/* Render icon row only for generic action messages */}
                      {isActionMessage && hoveredMessageIndex === index && (                          <div
                            className="
                              absolute 
                              -bottom-3 right-1
                              w-fit
                              flex justify-end items-center
                              space-x-1.5
                              bg-background/95
                              backdrop-blur-sm
                              rounded-lg
                              p-1
                              border border-border/30
                              shadow-md
                              z-10
                            "
                          >                            <Tooltip content="Visualize Chart">
                              <button
                                onClick={handleVisualize}
                                className="group tooltip-container p-1 z-20 hover:bg-accent rounded-md transition cursor-pointer"
                              >
                                <ChartArea size={14} className="text-muted-foreground hover:text-foreground" />
                              </button>
                            </Tooltip>

                            <Tooltip content="View SQL Query">
                              <button
                                onClick={handleSqlQuery}
                                className="group tooltip-container p-1 z-20 hover:bg-accent rounded-md transition cursor-pointer"
                              >
                                <SquareTerminal
                                  size={14}
                                  className="text-muted-foreground hover:text-foreground"
                                />
                              </button>
                            </Tooltip>

                            <Tooltip content="Explain Result">
                              <button
                                onClick={handleExplainData}
                                className="group tooltip-container p-1 z-20 hover:bg-accent rounded-md transition cursor-pointer"
                              >
                                <Search size={14} className="text-muted-foreground hover:text-foreground" />
                              </button>
                            </Tooltip>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {/* 

                {showSQL && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-700 p-2 rounded-md mt-1 text-xs text-gray-100"
                  >
                    <pre className="whitespace-pre-wrap">{generatedSQL}</pre>
                  </motion.div>
                )}

                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-700 p-2 rounded-md mt-1 text-xs text-gray-100"
                  >
                    <pre className="whitespace-pre-wrap">
                      {generatedSummary}
                    </pre>
                  </motion.div>
                )} */}                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg text-sm max-w-[85%] self-start bg-card/80 border border-border/30 text-card-foreground flex items-center gap-2"
                  >
                    <div className="w-5 h-5 flex-shrink-0">
                      <Lottie options={defaultOptions} height={20} width={20} />
                    </div>
                    <span className="text-muted-foreground">AI is thinking...</span>
                  </motion.div>
                )}
              </div>
            )}
            <Spotlight />
          </div>

          {/* Chat Input */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute bottom-6 left-6 right-6"
          >            <PlaceholdersAndVanishInput
              placeholders={
                suggestions.length > 0
                  ? ["Ask me anything", ...suggestions.map(s => s.text)]
                  : ["Ask me anything..."]
              }
              onChange={handleChange}
              onSubmit={handleSubmit}
            />
          </motion.div>
        </motion.div>
      )}
      <AlertDialog open={isConsentOpen} onOpenChange={setIsConsentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Consent Required</AlertDialogTitle>
            <AlertDialogDescription>
              To provide an accurate explanation, we need to analyze your data,
              which may contain sensitive information. Do you consent to this
              analysis?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConsentOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExplain}>
              I Consent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
}
