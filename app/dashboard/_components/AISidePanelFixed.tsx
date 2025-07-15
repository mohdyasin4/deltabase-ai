"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidePanelStore } from "@/store/sidePanelStates";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store/useStatesStore";
import { detectDatetimeColumns, formatRowData } from "@/utils/datetimeUtils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Loader2,
  Bot,
  User,
  Zap,
  Target,
  BarChart3
} from "lucide-react";

// Enhanced types
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

// Helper functions
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "analysis": return TrendingUp;
    case "visualization": return ChartArea;
    case "query": return Zap;
    case "insight": return Lightbulb;
    case "advanced": return Code2;
    default: return Zap;
  }
};

const getDefaultSuggestions = (): Suggestion[] => [
  {
    id: "1",
    text: "Show me all tables in the database",
    category: "query",
    icon: Zap,
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
  {
    id: "6",
    text: "Show recent data entries",
    category: "query",
    icon: Clock,
    difficulty: "beginner",
    estimatedTime: "1-2 sec",
    description: "Display the most recently added records"
  },
  {
    id: "7",
    text: "Compare monthly performance",
    category: "analysis",
    icon: TrendingUp,
    difficulty: "intermediate",
    estimatedTime: "5-8 sec",
    description: "Analyze trends across different time periods"
  },
  {
    id: "8",
    text: "Search specific records",
    category: "query",
    icon: Search,
    difficulty: "beginner",
    estimatedTime: "1-2 sec",
    description: "Find specific data entries with filters"
  },
  {
    id: "9",
    text: "Export query results",
    category: "advanced",
    icon: ArrowRight,
    difficulty: "intermediate",
    estimatedTime: "2-5 sec",
    description: "Download your data in various formats"
  },
  {
    id: "10",
    text: "Count total records",
    category: "query",
    icon: Target,
    difficulty: "beginner",
    estimatedTime: "1-2 sec",
    description: "Get the total number of records in the table"
  },
  {
    id: "11",
    text: "Find duplicate records",
    category: "insight",
    icon: Lightbulb,
    difficulty: "intermediate",
    estimatedTime: "5-8 sec",
    description: "Identify duplicate entries in your data"
  },
  {
    id: "12",
    text: "Calculate averages",
    category: "analysis",
    icon: BarChart3,
    difficulty: "intermediate",
    estimatedTime: "3-5 sec",
    description: "Calculate average values for numeric columns"
  },
];

export function parseAggregateAndGroupBy(query: string): {
  aggregate?: string;
  aggColumn?: string;
  groupBy?: string[];
} {
  const cleanedQuery = query.trim().replace(/;$/, "");
  const aggregateMatch = cleanedQuery.match(/(COUNT|SUM|AVG|MIN|MAX)\\s*\\((\\*|[\\w\\.]+)\\)/i);
  const aggregate = aggregateMatch ? aggregateMatch[1].toLowerCase() : undefined;
  const aggColumn = aggregateMatch && aggregateMatch[2] !== "*" ? aggregateMatch[2] : undefined;
  const groupByMatch = cleanedQuery.match(/GROUP BY\\s+(.+?)(ORDER BY|$)/i);
  let groupBy: string[] = [];
  if (groupByMatch && groupByMatch[1]) {
    groupBy = groupByMatch[1]
      .split(",")
      .map((s) => s.trim())
      .map((col) => {
        const funcMatch = col.match(/(?:\\w+\\()?\\s*([\\w\\.]+)(?:\\))?/);
        return funcMatch ? funcMatch[1] : col;
      });
  }
  return { aggregate, aggColumn, groupBy };
}

// Enhanced Welcome Screen with Magic UI Aesthetics
const WelcomeScreen = ({
  suggestions,
  handleQuickAction,
  onRefreshSuggestions,
  isLoadingSuggestions,
}: {
  suggestions: Suggestion[];
  handleQuickAction: (query: string) => void;
  onRefreshSuggestions: () => void;
  isLoadingSuggestions: boolean;
}) => {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Enhanced Background with Mesh Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/50 to-background opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:to-purple-950/20" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
            style={{
              left: `${10 + i * 25}%`,
              top: `${10 + i * 15}%`,
            }}
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-xl" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8"
        >
          {/* AI Avatar with Enhanced Animations */}
          <motion.div
            className="relative inline-block mb-8"
            initial={{ scale: 0.5, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20, 
              delay: 0.2 
            }}
          >
            {/* Orbital Rings */}
            <motion.div
              className="absolute inset-0 w-24 h-24 rounded-full border border-blue-500/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 w-20 h-20 rounded-full border border-purple-500/30"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Main Avatar */}
            <motion.div
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {/* Dynamic Background */}
              <motion.div
                className="absolute inset-0"
                animate={{
                  background: [
                    'radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.1), transparent 50%)',
                    'radial-gradient(circle at 70% 60%, rgba(168, 85, 247, 0.1), transparent 50%)',
                    'radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.1), transparent 50%)',
                    'radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.1), transparent 50%)',
                  ]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Central Icon */}
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 12, repeat: Infinity, ease: "linear" },
                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative z-10"
              >
                <Sparkles className="w-12 h-12 text-blue-500" />
              </motion.div>

              {/* Particle System */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full"
                  animate={{
                    x: [0, Math.cos(i * 45 * Math.PI / 180) * 40],
                    y: [0, Math.sin(i * 45 * Math.PI / 180) * 40],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut"
                  }}
                  style={{
                    left: '50%',
                    top: '50%',
                    marginLeft: '-3px',
                    marginTop: '-3px',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Enhanced Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <motion.h1 
              className="text-3xl font-bold mb-3"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              AI Data Assistant
            </motion.h1>
            
            <motion.div
              className="w-20 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mx-auto rounded-full"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 80, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
            />
          </motion.div>
          
          {/* Enhanced Description */}
          <motion.p 
            className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            Transform your data into insights with{" "}
            <motion.span 
              className="text-blue-600 font-semibold"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              natural language
            </motion.span>{" "}
            queries. Ask anything, get everything.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            className="flex justify-center gap-3 flex-wrap mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {[
              { icon: Brain, label: "Smart Analysis", color: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
              { icon: ChartArea, label: "Visual Charts", color: "from-purple-500/20 to-purple-600/20 border-purple-500/30" },
              { icon: Lightbulb, label: "Auto Insights", color: "from-amber-500/20 to-amber-600/20 border-amber-500/30" },
            ].map((feature, index) => (
              <motion.div
                key={feature.label}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${feature.color} border backdrop-blur-sm`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <feature.icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Suggestions Section */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center justify-between mb-4"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Suggested Queries
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshSuggestions}
              disabled={isLoadingSuggestions}
              className="h-8 px-3 text-xs border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200"
            >
              {isLoadingSuggestions ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-3 h-3 mr-1.5" />
                  New Ideas
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Suggestions Grid */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-2 flex-1 overflow-y-auto"
          >
            <AnimatePresence>
              {suggestions.slice(0, 15).map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <SuggestionCard
                    suggestion={suggestion}
                    onClick={() => handleQuickAction(suggestion.text)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Enhanced Suggestion Card with Modern Design
const SuggestionCard = ({
  suggestion,
  onClick,
}: {
  suggestion: Suggestion;
  onClick: () => void;
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="w-full p-4 rounded-xl border border-border/40 bg-gradient-to-br from-card/30 to-card/10 hover:from-card/50 hover:to-card/20 hover:border-border/60 transition-all duration-200 text-left group backdrop-blur-sm shadow-sm hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {/* Icon Container */}
        <motion.div 
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-[1.05]",
            suggestion.difficulty === "beginner" && "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-900/10 group-hover:from-emerald-200 group-hover:to-emerald-100 dark:group-hover:from-emerald-900/50 dark:group-hover:to-emerald-800/20",
            suggestion.difficulty === "intermediate" && "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/10 group-hover:from-blue-200 group-hover:to-blue-100 dark:group-hover:from-blue-900/50 dark:group-hover:to-blue-800/20",
            suggestion.difficulty === "advanced" && "bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-purple-900/10 group-hover:from-purple-200 group-hover:to-purple-100 dark:group-hover:from-purple-900/50 dark:group-hover:to-purple-800/20"
          )}
          whileHover={{ rotate: 2 }}
        >
          <suggestion.icon className={cn(
            "w-4 h-4 transition-colors duration-200",
            suggestion.difficulty === "beginner" && "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
            suggestion.difficulty === "intermediate" && "text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300",
            suggestion.difficulty === "advanced" && "text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300"
          )} />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          {/* Title with Arrow */}
          <div className="flex items-start gap-2 mb-2">
            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors duration-200 leading-relaxed flex-1">
              {suggestion.text}
            </h4>
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5"
              initial={{ x: -3 }}
              whileHover={{ x: 0 }}
            >
              <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            </motion.div>
          </div>
          
          {/* Metadata Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                suggestion.difficulty === "beginner" && "bg-emerald-500",
                suggestion.difficulty === "intermediate" && "bg-blue-500", 
                suggestion.difficulty === "advanced" && "bg-purple-500"
              )} />
              <span className={cn(
                "text-xs font-medium capitalize",
                suggestion.difficulty === "beginner" && "text-emerald-600 dark:text-emerald-400",
                suggestion.difficulty === "intermediate" && "text-blue-600 dark:text-blue-400",
                suggestion.difficulty === "advanced" && "text-purple-600 dark:text-purple-400"
              )}>
                {suggestion.difficulty}
              </span>
            </div>
            
            {suggestion.estimatedTime && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary/70 transition-colors duration-200 font-medium">
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

// Modern Message Component (placeholder for now)
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
          ? "bg-muted/30 text-foreground" 
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

// Main Component (same as before, just replace the WelcomeScreen usage)
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
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
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
    setIsLoadingSuggestions(true);
    
    if (!connection_id || !tableName) {
      setSuggestions(getDefaultSuggestions());
      setIsLoadingSuggestions(false);
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
            icon: Zap,
            difficulty: "intermediate" as const,
            estimatedTime: "3-5 sec",
            description: "AI-generated query suggestion"
          }));
          setSuggestions(convertedSuggestions);
        } else {
          setSuggestions(getDefaultSuggestions());
        }
      } else {
        setSuggestions(getDefaultSuggestions());
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setSuggestions(getDefaultSuggestions());
    } finally {
      setIsLoadingSuggestions(false);
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
    setSelectedVisualization("bar");
    
    const message: Message = {
      id: Date.now().toString(),
      sender: "ai",
      text: "Visualization switched to bar chart.",
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
            className="fixed right-0 top-0 h-screen w-[540px] bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col z-50"
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
                  onRefreshSuggestions={fetchSuggestions}
                  isLoadingSuggestions={isLoadingSuggestions}
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
                      <div className="bg-muted/30 rounded-2xl px-4 py-3 flex items-center gap-2">
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
