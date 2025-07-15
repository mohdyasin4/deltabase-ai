"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { useSidePanelStore } from "@/store/sidePanelStates";
import { useStore } from "@/store/useStatesStore";
import { 
  X, 
  Send, 
  Sparkles, 
  RefreshCcw, 
  Plus,
  Search,
  Clock,
  Database,
  ChartArea,
  TrendingUp,
  Lightbulb,
  Code2,
  ArrowRight,
  Check,
  Mic,
  CheckCircle,
  AlertCircle,
  Brain,
  Copy,
  Volume2,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Hash,
  Loader2,
  Wand2,
  MessageSquare,
  Eye,
  Settings,
  Bot,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  detectDatetimeColumns, 
  formatRowData 
} from "@/utils/datetimeUtils";
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

export function parseAggregateAndGroupBy(query: string): {
  aggregate?: string;
  aggColumn?: string;
  groupBy?: string[];
} {
  const cleanedQuery = query.trim().replace(/;$/, "");
  const aggregateMatch = cleanedQuery.match(
    /(COUNT|SUM|AVG|MIN|MAX)\s*\((\*|[\w\.]+)\)/i
  );
  const aggregate = aggregateMatch ? aggregateMatch[1].toLowerCase() : undefined;
  const aggColumn = aggregateMatch && aggregateMatch[2] !== "*" ? aggregateMatch[2] : undefined;
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

// Modern Welcome Screen with minimal design
const WelcomeScreen = ({
  suggestions,
  handleQuickAction,
}: {
  suggestions: Suggestion[];
  handleQuickAction: (query: string) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        {/* AI Avatar */}
        <motion.div
          className="relative inline-block mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-border/50 backdrop-blur-sm">
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Sparkles className="w-8 h-8 text-blue-500" />
            </motion.div>
          </div>
          
          {/* Status indicator */}
          <motion.div 
            className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-background"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Check className="w-2.5 h-2.5 text-white" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h2 
          className="text-xl font-semibold text-foreground mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          AI Assistant
        </motion.h2>
        
        <motion.p 
          className="text-sm text-muted-foreground max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Ask questions about your data in natural language and get instant insights.
        </motion.p>
      </motion.div>

      {/* Search Bar */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search suggestions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-border/50 bg-background/50 focus:bg-background focus:border-primary/50"
            />
          </div>
        </motion.div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-3 flex-1 overflow-y-auto"
        >
          <AnimatePresence>
            {filteredSuggestions.slice(0, 6).map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <SuggestionCard
                  suggestion={suggestion}
                  onClick={() => handleQuickAction(suggestion.text)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredSuggestions.length === 0 && searchQuery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No suggestions found</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Minimal Suggestion Card
const SuggestionCard = ({
  suggestion,
  onClick,
}: {
  suggestion: Suggestion;
  onClick: () => void;
}) => {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:border-border transition-all duration-200 text-left group backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
          suggestion.difficulty === "beginner" && "bg-green-100 dark:bg-green-950/30",
          suggestion.difficulty === "intermediate" && "bg-yellow-100 dark:bg-yellow-950/30",
          suggestion.difficulty === "advanced" && "bg-red-100 dark:bg-red-950/30"
        )}>
          <suggestion.icon className={cn(
            "w-5 h-5",
            suggestion.difficulty === "beginner" && "text-green-600 dark:text-green-400",
            suggestion.difficulty === "intermediate" && "text-yellow-600 dark:text-yellow-400",
            suggestion.difficulty === "advanced" && "text-red-600 dark:text-red-400"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
              {suggestion.text}
            </h4>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-xs capitalize">
              {suggestion.category}
            </Badge>
            {suggestion.estimatedTime && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {suggestion.estimatedTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
};

// Modern Message Component
const MessageBubble = ({
  message,
  isLatest,
  onAction,
}: {
  message: Message;
  isLatest: boolean;
  onAction: (action: string) => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const isAI = message.sender === "ai";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 mb-4",
        isAI ? "justify-start" : "justify-end"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {isAI && (
        <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "relative max-w-[85%] rounded-2xl px-4 py-3",
        isAI 
          ? "bg-muted/50 text-foreground" 
          : "bg-primary text-primary-foreground ml-auto"
      )}>
        <p className="text-sm leading-relaxed">{message.text}</p>
        
        {/* Metadata */}
        {message.metadata && (
          <div className="mt-2 flex flex-wrap gap-1">
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
          </div>
        )}
        
        {/* SQL Query Display */}
        {message.metadata?.sqlQuery && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Generated SQL</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => navigator.clipboard.writeText(message.metadata?.sqlQuery || "")}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <code className="text-xs font-mono text-foreground/80 block">
              {message.metadata.sqlQuery}
            </code>
          </div>
        )}
        
        {/* Action buttons */}
        {isAI && isLatest && message.text.includes("processed") && showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-2 right-2 flex items-center gap-1 bg-background border border-border/50 rounded-lg p-1 shadow-lg"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction("visualize")}
                    className="h-7 w-7 p-0"
                  >
                    <ChartArea className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualize</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction("sql")}
                    className="h-7 w-7 p-0"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View SQL</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction("explain")}
                    className="h-7 w-7 p-0"
                  >
                    <Brain className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Explain</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </div>
      
      {!isAI && (
        <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white text-xs">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
};

// Main Component
export default function AISidePanelNew() {
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
    setColumns,
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
    setSelectedVisualization,
  } = useStore();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const latestUserQueryRef = useRef<string>("");
  const pathname = usePathname();

  // Close panel when pathname changes
  useEffect(() => {
    setIsAiSidePanelOpen(false);
  }, [pathname, setIsAiSidePanelOpen]);

  // Fetch suggestions
  const fetchSuggestions = async () => {
    if (!connection_id || !tableName) {
      setSuggestions(getDefaultSuggestions());
      return;
    }
    
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
        const data = await response.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
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
        }
      } else {
        setSuggestions(getDefaultSuggestions());
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setSuggestions(getDefaultSuggestions());
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [connection_id, tableName]);

  // Handle input submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    await processQuery(inputValue.trim());
  };

  // Handle quick actions
  const handleQuickAction = async (query: string) => {
    setInputValue(query);
    await processQuery(query);
  };

  // Process query
  const processQuery = async (userQuery: string) => {
    latestUserQueryRef.current = userQuery;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userQuery,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Get AI-generated SQL query
      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id, tableName, userQuery }),
      });
      
      if (!geminiResponse.ok) throw new Error("Failed to generate SQL query.");
      
      const geminiData = await geminiResponse.json();
      let sqlQuery = geminiData.sqlQuery;
      sqlQuery = sqlQuery.trim().replace(/;$/, "");
      setGeneratedSql(sqlQuery);

      // Execute the SQL query
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
      if (!Array.isArray(queryResult) || queryResult.length === 0) {
        throw new Error("No data returned from query.");
      }

      // Process results
      const columns = queryResult.length > 0 ? Object.keys(queryResult[0]) : [];
      const datetimeCols = detectDatetimeColumns(queryResult);
      setDatetimeColumns(datetimeCols);
      setQueryResult(queryResult);

      const formattedRows = queryResult.map((row: any) =>
        formatRowData(row, datetimeCols)
      );

      // Update store states
      const { aggregate, groupBy, aggColumn } = parseAggregateAndGroupBy(sqlQuery);
      setSelectedAggregate(aggregate || null);
      setGroupByValue(groupBy || []);
      if (aggColumn) setSelectedValues([aggColumn]);
      setColumns(columns);
      setPrimaryKeys(primaryKeys[0]);
      setColumnTypes(columnTypes);
      setRows(formattedRows);
      setRawRows(queryResult);
      setSqlAiQuery(sqlQuery);
      setSqlQuery(sqlQuery);

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Your query has been processed successfully. Choose an action below.",
        timestamp: new Date(),
        type: "result",
        metadata: {
          executionTime: queryExecutionTime,
          sqlQuery: sqlQuery,
          resultCount: queryResult.length,
          confidence: 95,
        }
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Error processing query:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: error.message || "An error occurred while processing your query.",
        timestamp: new Date(),
        type: "error",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Action handlers
  const handleVisualize = () => {
    const rows = Array.isArray(useStore.getState().rawRows) ? useStore.getState().rawRows : [];
    const vizType = "bar"; // You can implement smart detection here
    setSelectedVisualization(vizType);
    
    const message: Message = {
      id: Date.now().toString(),
      sender: "ai",
      text: `Visualization switched to ${vizType} chart.`,
      timestamp: new Date(),
      type: "visualization",
    };
    setMessages(prev => [...prev, message]);
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
    setIsConsentOpen(false);
    // Add explanation logic here
    const message: Message = {
      id: Date.now().toString(),
      sender: "ai",
      text: "Data explanation feature is being processed...",
      timestamp: new Date(),
      type: "insight",
    };
    setMessages(prev => [...prev, message]);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue("");
    fetchSuggestions();
  };

  const handleLearnSchema = async () => {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnSchema: true, connection_id }),
      });
      
      if (!response.ok) throw new Error("Failed to load database schema.");
      
      const message: Message = {
        id: Date.now().toString(),
        sender: "ai",
        text: "Database schema loaded successfully.",
        timestamp: new Date(),
        type: "result",
      };
      setMessages(prev => [...prev, message]);
    } catch (error: any) {
      const message: Message = {
        id: Date.now().toString(),
        sender: "ai",
        text: error.message || "Failed to load database schema.",
        timestamp: new Date(),
        type: "error",
      };
      setMessages(prev => [...prev, message]);
    }
  };

  return (
    <TooltipProvider>
      <AnimatePresence>
        {isAiSidePanelOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="fixed right-0 top-0 h-screen w-[480px] bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col z-50"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <h1 className="font-semibold text-foreground">AI Assistant</h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNewChat}
                      className="h-8 w-8 p-0"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New Chat</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLearnSchema}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Learn Schema</TooltipContent>
                </Tooltip>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAiSidePanelOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {messages.length === 0 ? (
                <WelcomeScreen
                  suggestions={suggestions}
                  handleQuickAction={handleQuickAction}
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isLatest={message.id === messages[messages.length - 1]?.id}
                      onAction={(action) => {
                        if (action === "visualize") handleVisualize();
                        if (action === "sql") handleSqlQuery();
                        if (action === "explain") handleExplainData();
                      }}
                    />
                  ))}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">AI is thinking...</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm"
              >
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything about your data..."
                    className="flex-1 border-border/50 bg-background/50 focus:bg-background focus:border-primary/50"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputValue.trim() || isLoading}
                    className="px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent Dialog */}
      <AlertDialog open={isConsentOpen} onOpenChange={setIsConsentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data Analysis Consent</AlertDialogTitle>
            <AlertDialogDescription>
              To provide accurate insights, we need to analyze your data. This may include sensitive information. 
              Do you consent to this analysis?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExplain}>
              I Consent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
