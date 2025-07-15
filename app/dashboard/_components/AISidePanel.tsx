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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import TextCycler from "@/components/magicui/text-cycler";
import { useSpeech, cleanTextForSpeech, speakWithEmotion } from "@/utils/textToSpeech";
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
  BarChart3,
  RotateCcw
} from "lucide-react";

// AI Loading Message Component
// Enhanced types
interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;  type?: "query" | "result" | "error" | "insight" | "sql" | "visualization" | "suggestion" | "loading" | "response";
  isGenerating?: boolean; // New prop to handle text animation during generation
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
    originalQuery?: string;
    isOffTopic?: boolean;
  };
}

interface Suggestion {
  id: string;
  text: string;
  category: "analysis" | "visualization" | "query" | "insight" | "advanced";
  icon: React.ComponentType<{ className?: string }>;
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

// Modern Welcome Screen with Professional Design
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
      {/* Clean Professional Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background to-background/90" />
      
      {/* Subtle Animated Grid */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
        <motion.div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
          animate={{
            backgroundPosition: ['0px 0px', '60px 60px'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Professional Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.02, 0.05, 0.02],
              y: [0, -100, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 15 + i * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 2,
            }}
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 20}%`,
            }}
          >
            <div 
              className="w-40 h-40 rounded-full blur-3xl"
              style={{
                background: `linear-gradient(135deg, 
                  hsl(var(--primary) / 0.03) 0%, 
                  hsl(var(--primary) / 0.01) 100%)`
              }}
            />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8"
        >          {/* Animated AI Avatar */}
          <motion.div
            className="relative inline-block mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/15 dark:from-primary/10 dark:to-primary/5 backdrop-blur-sm border border-amber-500/30 dark:border-primary/20 flex items-center justify-center shadow-lg relative overflow-hidden">
              {/* Animated sparkles */}
              <motion.div
                className="absolute inset-0"
                animate={{ 
                  background: [
                    "radial-gradient(circle at 20% 50%, hsl(45 93% 47% / 0.15) 0%, transparent 50%)",
                    "radial-gradient(circle at 80% 50%, hsl(45 93% 47% / 0.15) 0%, transparent 50%)",
                    "radial-gradient(circle at 50% 20%, hsl(45 93% 47% / 0.15) 0%, transparent 50%)",
                    "radial-gradient(circle at 50% 80%, hsl(45 93% 47% / 0.15) 0%, transparent 50%)",
                  ]
                }}
                style={{
                  background: "var(--tw-gradient-stops)"
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Main icon with multiple animations */}
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative z-10"
              >
                <Sparkles className="w-8 h-8 text-amber-600 dark:text-primary" />
              </motion.div>
              
              {/* Floating particles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-amber-500/40 dark:bg-primary/30 rounded-full"
                  animate={{
                    x: [0, 20, -20, 0],
                    y: [0, -20, 20, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + i,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: "easeInOut"
                  }}
                  style={{
                    left: `${30 + i * 20}%`,
                    top: `${30 + i * 15}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Professional Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Talk with your data
            </h1>
            
            <div className="w-16 h-0.5 bg-primary/60 mx-auto rounded-full mb-4" />
            
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              Ask questions in natural language and get instant insights from your database
            </p>
          </motion.div>
        </motion.div>        {/* Suggestions Section */}
        {isLoadingSuggestions ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading suggestions...</span>
            </div>
          </motion.div>
        ) : suggestions.length > 0 ? (
          <>
            {/* Suggestions Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex items-center justify-between mb-4"
            >
              <h3 className="text-sm font-medium text-foreground">
                Suggested Prompts
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshSuggestions}
                disabled={isLoadingSuggestions}
                className="h-7 px-3 text-xs border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <RefreshCcw className="w-3 h-3 mr-1.5" />
                Refresh
              </Button>
            </motion.div>

            {/* Suggestions Grid - Optimized */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="grid gap-2"
            >
              {suggestions.slice(0, 6).map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.03, duration: 0.3 }}
                >
                  <SuggestionCard
                    suggestion={suggestion}
                    onClick={() => handleQuickAction(suggestion.text)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  );
};

// Enhanced Suggestion Card with Modern Design - Optimized Size
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
      className="w-full p-3 rounded-lg border border-border/40 bg-gradient-to-br from-card/30 to-card/10 hover:from-card/50 hover:to-card/20 hover:border-border/60 transition-all duration-200 text-left group backdrop-blur-sm shadow-sm hover:shadow-md overflow-hidden"
    >
      <div className="flex items-center gap-3">
        {/* Icon Container */}
        <motion.div 
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-[1.05] bg-primary/10 border border-primary/20"
          whileHover={{ rotate: 2 }}
        >
          <suggestion.icon className="w-4 h-4 text-primary transition-colors duration-200" />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          {/* Title with Arrow */}
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors duration-200 leading-relaxed flex-1">
              {suggestion.text}
            </h4>
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              initial={{ x: -3 }}
              whileHover={{ x: 0 }}
            >
              <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            </motion.div>
          </div>
        </div>
      </div>    </motion.button>
  );
};

// Compact Suggestions Bar for Chat Mode
const CompactSuggestionsBar = ({
  suggestions,
  handleQuickAction,
  isVisible,
  onToggle,
  onRefresh,
  isRefreshing,
}: {
  suggestions: Suggestion[];
  handleQuickAction: (query: string) => void;
  isVisible: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) => {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="px-4 pb-2 border-t border-border/30"
    >      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Suggestions</span>          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh suggestions"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
        <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 3).map((suggestion) => (
          <motion.button
            key={suggestion.id}
            onClick={() => handleQuickAction(suggestion.text)}
            className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border border-border/50 hover:border-primary/50 transition-all duration-200 flex-shrink-0 max-w-[200px] text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={suggestion.text} // Show full text on hover
          >
            <span className="truncate block">
              {suggestion.text.length > 25 ? `${suggestion.text.substring(0, 25)}...` : suggestion.text}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

// Modern Message Component
const MessageBubble = ({
  message,
  isLatest,
  onAction,
  user,  onRetry,
  onSpeak,
  isSpeechSupported,
}: {
  message: Message;
  isLatest: boolean;
  onAction: (action: string) => void;
  user?: any;
  onRetry?: (query: string) => void;
  onSpeak?: (text: string) => void;
  isSpeechSupported?: boolean;
}) => {const [showActions, setShowActions] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isAI = message.sender === "ai";
  const isError = message.type === "error";

  // Reset transition states when message changes from generating to complete
  useEffect(() => {
    if (message.isGenerating) {
      // Reset states when message starts generating
      setIsTransitioning(false);
    }
  }, [message.isGenerating, message.text]);

  const loadingTexts = [
    "Processing request...",
    "AI is thinking...",
    "Analyzing data...",
    "Generating response...",
    "Computing results..."
  ];  // Handle transition from loading to response
  useEffect(() => {
    if (!message.isGenerating && !isTransitioning && message.text) {
      // Small delay to ensure the message text is properly set
      const transitionTimer = setTimeout(() => {
        setIsTransitioning(true);
      }, 100);
      
      return () => clearTimeout(transitionTimer);
    }
  }, [message.isGenerating, message.text, isTransitioning]);
  
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
    >      {isAI && (
        <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-yellow-400 text-xs font-semibold shadow-lg border border-gray-700">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}<div className={cn(
        "relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
        isAI 
          ? "bg-muted/50 border border-border/30 text-foreground" 
          : "bg-primary text-primary-foreground ml-auto"
      )}>        <div className="space-y-3">
          {message.isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm leading-relaxed text-muted-foreground">
                Processing your request...
              </span>
            </motion.div>          ) : isTransitioning ? (
            <motion.div
              key="transitioning"              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TextCycler
                words={["Processing your request...", message.text]}
                currentIndex={1}
                className="text-sm leading-relaxed"
                onTransitionComplete={() => {
                  // Just mark as not transitioning, let TextCycler stay
                  setIsTransitioning(false);
                }}
              />
            </motion.div>          ) : (
            <motion.div
              key="fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
            </motion.div>
          )}          {/* Show explanation badge for insight messages below the text */}
          {message.type === "insight" && !message.isGenerating && (
            <div className="flex justify-start">
              <Badge 
                variant="outline" 
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 rounded-full text-xs font-medium shadow-sm"
              >
                <Lightbulb className="w-3 h-3" />
                Data Explanation
              </Badge>
            </div>
          )}
            {/* Enhanced Metadata - Hide for insight/explanation messages and successful query results */}
          {message.metadata && message.type !== "insight" && message.type !== "result" && (<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
              {message.metadata.executionTime && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  {message.metadata.executionTime}ms
                </div>
              )}
              {message.metadata.resultCount !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <Database className="w-3 h-3" />
                  {message.metadata.resultCount} rows
                </div>
              )}
              {message.metadata.resultCount !== undefined && message.metadata.resultCount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Success
                </div>
              )}
            </div>
          )}
        </div>        {/* Action buttons - Show retry for errors, other actions for results (but not during loading) */}
        {isAI && showActions && !message.isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-2 right-2 flex items-center gap-1 bg-background border border-border/50 rounded-lg p-1 shadow-lg"
          >            {/* Retry button for error messages and off-topic responses */}
            {(isError || message.metadata?.isOffTopic) && onRetry && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const previousUserMessage = message.metadata?.originalQuery;
                        if (previousUserMessage) {
                          onRetry(previousUserMessage);
                        }
                      }}
                      className="h-7 w-7 p-0 text-white hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Retry</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}            {/* Regular action buttons for successful AI result messages (exclude off-topic responses and explanations) */}
            {!isError && isAI && message.text && !message.metadata?.isOffTopic && message.type !== "insight" && (
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
                  </TooltipTrigger>                  <TooltipContent>Explain</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
              {/* Speak button for explanation messages */}
            {!isError && isAI && message.text && message.type === "insight" && onSpeak && isSpeechSupported && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"                      onClick={() => {                        if (onSpeak) {
                          // Clean the text and speak it with empathetic emotion
                          const cleanText = cleanTextForSpeech(message.text);
                          onSpeak(cleanText);
                        }
                      }}
                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/20"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Listen to Explanation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </motion.div>
        )}      </div>

        {!isAI && (
        <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
          <AvatarImage 
            src={user?.imageUrl} 
            alt={user?.firstName || "User"}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-600">
            {user?.firstName?.charAt(0)?.toUpperCase() || 
             user?.lastName?.charAt(0)?.toUpperCase() || 
             user?.emailAddresses?.[0]?.emailAddress?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
};

// Main Component (same as before, just replace the WelcomeScreen usage)
export default function AISidePanel() {
  const { user } = useUser();
  
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
  } = useStore();  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);  const latestUserQueryRef = useRef<string>("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
    // Enhanced text-to-speech functionality with emotional voices
  const { speakWithEmotion: speakWithEmotionHook, stop: stopSpeech, isSupported: isSpeechSupported } = useSpeech();

  // Enhanced speak function for AI explanations
  const speakExplanation = async (text: string) => {
    const cleanText = cleanTextForSpeech(text);
    try {
      await speakWithEmotion(cleanText, 'empathetic'); // Use empathetic voice for explanations
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const pathname = usePathname();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure DOM is updated
    }
  }, [messages]);

  // Close panel when pathname changes
  useEffect(() => {
    setIsAiSidePanelOpen(false);
  }, [pathname, setIsAiSidePanelOpen]);
    // Fetch suggestions
  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    
    if (!connection_id || !tableName) {
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
            description: "AI-generated query suggestion"
          }));
          setSuggestions(convertedSuggestions);
        }
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
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
  };  // Handle suggestion clicks
  const handleQuickAction = async (query: string) => {
    // Remove the used suggestion and replace with a new one
    const usedSuggestionIndex = suggestions.findIndex(s => s.text === query);
    if (usedSuggestionIndex !== -1) {
      // Remove the used suggestion
      const updatedSuggestions = suggestions.filter(s => s.text !== query);
      setSuggestions(updatedSuggestions);
      
      // Fetch new suggestions in the background to replace the used one
      setTimeout(() => {
        fetchSuggestions();
      }, 1000); // Small delay to avoid too many API calls
    }
    
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
    
    // Add generating AI message
    const aiMessageId = `ai-${Date.now()}`;
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setIsLoading(true);    // Add generating AI message
    setMessages(prev => [...prev, {
      id: aiMessageId,
      sender: "ai",
      text: "", // Will be shown via WordRotate
      timestamp: new Date(),
      type: "result",
      isGenerating: true
    } as Message]);try {
      // Reset chart configurations for new query (but don't switch to table yet)
      setXAxis("");
      setYAxis([]);
      setSelectedAggregate(null);
      setSelectedValues([]);
      setGroupByValue([]);

      // Get AI-generated SQL query
      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id, tableName, userQuery }),
      });
        if (!geminiResponse.ok) throw new Error("Failed to generate SQL query.");
        const geminiData = await geminiResponse.json();
      const sqlQuery = geminiData.sqlQuery;
      const aiResponseText = geminiData.aiResponse || "Query generated successfully.";      // Check if this is a non-data response (no SQL query generated)
      if (!sqlQuery) {
        // Update the generating message with the AI response for non-data questions
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? {
                ...msg,
                text: aiResponseText,
                isGenerating: false,
                type: "response", // Use response type for non-data responses (only shows retry)
                metadata: {
                  originalQuery: userQuery,
                  isOffTopic: true // Mark as off-topic to prevent action buttons
                }
              }
            : msg
        ));
        
        setIsLoading(false);
        return; // Exit early for non-data questions
      }
      
      // For data-related queries, continue with SQL execution
      const cleanSqlQuery = sqlQuery.trim().replace(/;$/, "");
      setGeneratedSql(cleanSqlQuery);      // Execute the SQL query
      const dbResponse = await fetch(`/api/database/${connection_id}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanSqlQuery }),
      });
      
      if (!dbResponse.ok) {
        // Parse the error response to get specific database error
        let dbErrorMessage = "Failed to fetch query results.";
        try {
          const errorData = await dbResponse.json();
          if (errorData.error) {
            dbErrorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error("Failed to parse database error response:", parseError);
        }
        throw new Error(dbErrorMessage);
      }
      
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
      );      // Update store states
      const { aggregate, groupBy, aggColumn } = parseAggregateAndGroupBy(cleanSqlQuery);
      setSelectedAggregate(aggregate || null);
      setGroupByValue(groupBy || []);
      if (aggColumn) setSelectedValues([aggColumn]);
      setColumns(columns);
      setPrimaryKeys(primaryKeys[0]);
      setColumnTypes(columnTypes);
      setRows(formattedRows);      setRawRows(queryResult);
      setSqlAiQuery(cleanSqlQuery);
      setSqlQuery(cleanSqlQuery);// Switch to table view after successful query execution
      setSelectedVisualization("table");      // Update the generating message with the actual response
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? {
              ...msg,
              text: aiResponseText,
              isGenerating: false,
              type: "result",
              metadata: {
                executionTime: queryExecutionTime,
                sqlQuery: sqlQuery,
                resultCount: queryResult.length,
                confidence: 95,
              }
            }
          : msg
      ));
      
      // Clear loading state for successful queries
      setIsLoading(false);    } catch (error: any) {
      console.error("Error processing query:", error);

      // Determine appropriate error message based on error type
      let errorResponseText = "";
      
      if (error.message.includes("Failed to generate SQL query")) {
        errorResponseText = "Unable to generate SQL query. Please rephrase your question or ensure it's related to your data.";
      } else if (error.message.includes("Failed to fetch query results")) {
        errorResponseText = "Unable to execute the query. Please check your database connection.";
      } else if (error.message.includes("No data returned")) {
        errorResponseText = "Query executed successfully but no data was found matching your criteria.";
      } else if (error.message.includes("column") || error.message.includes("table") || error.message.includes("syntax")) {
        // Show actual database errors for SQL-related issues
        errorResponseText = `Database Error: ${error.message}`;
      } else {
        errorResponseText = "I encountered an issue while processing your query. Please try rephrasing your question or check if your query is related to the data in your table.";
      }
      
      // Update the generating message with error
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? {
              ...msg,
              text: errorResponseText,
              type: "error",
              isGenerating: false,
              metadata: {
                originalQuery: userQuery,
                errorDetails: error.message
              }
            }
          : msg
      ));
      
      // Clear loading state for error responses
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };  // Function to detect chart type from user query
  const detectChartTypeFromQuery = (query: string): string => {
    const lowercaseQuery = query.toLowerCase();
    
    // Chart type keywords mapping
    const chartKeywords = {
      'pie': ['pie', 'pie chart', 'donut', 'circular', 'proportion', 'percentage breakdown', 'share', 'distribution'],
      'line': ['line', 'line chart', 'trend', 'over time', 'time series', 'timeline', 'progression', 'growth', 'change over'],
      'area': ['area', 'area chart', 'filled', 'area under', 'cumulative'],
      'bar': ['bar', 'bar chart', 'column', 'histogram', 'compare', 'comparison', 'versus', 'vs', 'by category'],
      'table': ['table', 'tabular', 'rows', 'list', 'show data', 'display data'],
      'number': ['count', 'total', 'sum', 'average', 'single value', 'metric']
    };
    
    // Check for specific chart type mentions
    for (const [chartType, keywords] of Object.entries(chartKeywords)) {
      if (keywords.some(keyword => lowercaseQuery.includes(keyword))) {
        return chartType;
      }
    }
    
    // Default fallback logic based on data characteristics
    if (queryResult && queryResult.length > 0) {
      const columns = Object.keys(queryResult[0]);
      const numericCols = columns.filter(col =>
        queryResult.some(row => typeof row[col] === "number") &&
        queryResult.every(row => row[col] === undefined || typeof row[col] === "number")
      );
      
      // If only one numeric column and one categorical, suggest pie chart
      if (numericCols.length === 1 && columns.length === 2) {
        return 'pie';
      }
      
      // If multiple numeric columns, suggest bar chart
      if (numericCols.length > 1) {
        return 'bar';
      }
    }
    
    // Default to bar chart
    return 'bar';
  };

  // Action handlers
  const handleVisualize = () => {
    // Detect chart type from user's query
    const userQuery = latestUserQueryRef.current || "";
    const detectedChartType = detectChartTypeFromQuery(userQuery);
    
    // Switch to detected visualization type
    setSelectedVisualization(detectedChartType);
    
    console.log("Detected chart type from query:", { query: userQuery, chartType: detectedChartType });
    
    // Auto-determine smart axes based on current data (except for table and number views)
    if (detectedChartType !== 'table' && detectedChartType !== 'number' && queryResult && queryResult.length > 0) {
      const columns = Object.keys(queryResult[0]);
      
      // Classify columns by data type for smart axis selection
      const numericCols = columns.filter(col =>
        queryResult.some(row => typeof row[col] === "number") &&
        queryResult.every(row => row[col] === undefined || typeof row[col] === "number")
      );
      
      const stringCols = columns.filter(col =>
        queryResult.some(row => typeof row[col] === "string")
      );
      
      // Set smart X and Y axes based on chart type
      let smartXAxis = "";
      let smartYAxis: string[] = [];
      
      if (detectedChartType === 'pie') {
        // For pie charts: categorical X-axis, single numeric Y-axis
        smartXAxis = stringCols[0] || columns[0] || "";
        smartYAxis = numericCols.length > 0 ? [numericCols[0]] : [columns[1] || ""];
      } else {
        // For bar, line, area charts: flexible X and Y axes
        smartXAxis = stringCols[0] || numericCols[0] || columns[0] || "";
        smartYAxis = numericCols.length > 0 ? [numericCols[0]] : (stringCols.length > 1 ? [stringCols[1]] : [columns[1] || ""]);
      }
      
      if (smartXAxis) setXAxis(smartXAxis);
      if (smartYAxis.length > 0) setYAxis(smartYAxis);
      
      console.log("Smart axes set for visualization:", { xAxis: smartXAxis, yAxis: smartYAxis, chartType: detectedChartType });
    }
    
    // Don't add a new message, just perform the action silently
    // The action buttons should remain visible on the last result message
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
  };  const handleConfirmExplain = async () => {
    setIsConsentOpen(false);
    
    // Add loading message for explanation
    const loadingMessageId = `loading-explain-${Date.now()}`;
    const loadingMessage: Message = {
      id: loadingMessageId,
      sender: "ai",
      text: "",
      timestamp: new Date(),
      type: "result",
      isGenerating: true
    } as Message;
    
    setMessages(prev => [...prev, loadingMessage]);
    setIsLoading(true);
    
      try {      // Get the current query results for analysis
      if (!queryResult || queryResult.length === 0) {
        // Use simple predefined message for no data available
        const noDataMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "No data is currently available to analyze. Please run a query first to get some results, then I can help explain the data patterns and insights.",
          timestamp: new Date(),
          type: "insight",
        };
        setMessages(prev => [...prev, noDataMessage]);
        setIsLoading(false);
        return;
      }

      // Prepare data for AI analysis
      const dataPreview = queryResult.slice(0, 5); // First 5 rows as sample
      const columns = Object.keys(queryResult[0]);
      const rowCount = queryResult.length;
        // Generate data explanation using AI
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summarize: true,
          userName: user?.firstName,
          connection_id,
          tableName,
          dataPreview,
          columns,
          rowCount,
          sqlQuery: generatedSql,
          userQuery: latestUserQueryRef.current,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate data explanation.");      const data = await response.json();
      const explanation = data.explanation || "Here's what I found in your data.";

      // Update the loading message with the actual explanation
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessageId 
          ? {
              ...msg,
              text: explanation,
              isGenerating: false,
              type: "insight",
              metadata: {
                resultCount: rowCount,
                sqlQuery: generatedSql,
                confidence: 90,
              }
            }
          : msg
      ));
      
      setIsLoading(false);    } catch (error: any) {      
      console.error("Error generating data explanation:", error);
      
      // Use simple predefined error message instead of additional API call
      const errorMessage = "I'm having trouble analyzing this data right now. The data might be too complex or there could be a temporary issue. Please try again or ask me a more specific question about your data.";
      
      // Show predefined error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessageId 
          ? {
              ...msg,
              text: errorMessage,
              isGenerating: false,
              type: "error",
              metadata: {
                resultCount: queryResult.length,
                sqlQuery: generatedSql,
              }
            }
          : msg
      ));
      
      setIsLoading(false);
    }
  };  const handleNewChat = () => {
    // Add a gentle animation when resetting chat
    setMessages([]);
    setInputValue("");
    setShowSuggestions(true); // Always show suggestions when starting new chat
    
    // Refetch suggestions with a small delay for smoother transition
    setTimeout(() => {
      fetchSuggestions();
    }, 200);
  };const handleLearnSchema = async () => {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnSchema: true, connection_id }),
      });
      
      const data = await response.json();
        if (!response.ok) {
        // Use AI response from error handling if available
        const aiText = data?.aiResponse || "";
        if (aiText) {
          const message: Message = {
            id: Date.now().toString(),
            sender: "ai",
            text: aiText,
            timestamp: new Date(),
            type: "error",
          };
          setMessages(prev => [...prev, message]);
        }
        return;
      }
      
      const aiResponseText = data.aiResponse || "Database schema loaded successfully.";
      
      const message: Message = {
        id: Date.now().toString(),
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date(),
        type: "result",
      };
      setMessages(prev => [...prev, message]);    } catch (error: any) {
      // Skip fallback error handling for network issues - let AI handle it if available
      console.error("Schema loading error:", error);
    }
  };
  return (
    <>
      <AnimatePresence>{isAiSidePanelOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0}}
            exit={{ x: "100%"}}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 120,
              duration: 0.6,
              opacity: { duration: 0.3 }
            }}
            className="fixed right-0 top-0 h-screen w-[540px] bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col z-50"
          >{/* Header */}
            <motion.div
              className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm z-50"
            >              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/15 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center border border-amber-500/30 dark:border-primary/20 relative overflow-hidden"
                  animate={{
                    boxShadow: [
                      "0 0 0 0px hsl(45 93% 47% / 0.1)",
                      "0 0 0 4px hsl(45 93% 47% / 0.05)",
                      "0 0 0 0px hsl(45 93% 47% / 0.1)",
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 180, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-primary" />
                  </motion.div>
                </motion.div>
                <h1 className="font-semibold text-foreground">Talk with your data</h1>
              </div>
                <div className="flex items-center gap-2">
                <TooltipProvider>
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
                </TooltipProvider>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAiSidePanelOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <AnimatePresence mode="wait">
                {messages.length === 0 ? (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ 
                      duration: 0.4, 
                      ease: [0.23, 1, 0.32, 1] // Custom cubic-bezier for smooth easing
                    }}
                    className="h-full"
                  >
                    <WelcomeScreen
                      suggestions={suggestions}
                      handleQuickAction={handleQuickAction}
                      onRefreshSuggestions={fetchSuggestions}
                      isLoadingSuggestions={isLoadingSuggestions}
                    />
                  </motion.div>
                ) : (                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.5, 
                      ease: [0.23, 1, 0.32, 1],
                      delay: 0.1 // Small delay for smoother transition
                    }}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    ref={messagesContainerRef}                  >{messages.map((message, index) => {
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 25 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            delay: index * 0.1,
                            duration: 0.3 
                          }}
                        >                          <MessageBubble
                            message={message}
                            isLatest={message.id === messages[messages.length - 1]?.id}
                            user={user}
                            onRetry={handleQuickAction}
                            onSpeak={speakExplanation}
                            isSpeechSupported={isSpeechSupported}
                            onAction={(action) => {
                              if (action === "visualize") handleVisualize();
                              if (action === "sql") handleSqlQuery();
                              if (action === "explain") handleExplainData();
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>                )}
              </AnimatePresence>

              {/* Compact Suggestions Bar for Chat Mode */}
              <AnimatePresence>
                {messages.length > 0 && (                  <CompactSuggestionsBar
                    suggestions={suggestions}
                    handleQuickAction={handleQuickAction}
                    isVisible={showSuggestions}
                    onToggle={() => setShowSuggestions(!showSuggestions)}
                    onRefresh={fetchSuggestions}
                    isRefreshing={isLoadingSuggestions}
                  />
                )}
              </AnimatePresence>

              {/* Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: messages.length === 0 ? 0.2 : 0.3, // Different delays based on state
                  duration: 0.6 
                }}
                className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm"
              >
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything about your data..."
                    className="flex-1 border-border/50 bg-background/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                    disabled={isLoading}
                  />
                  
                  {/* Suggestions Toggle Button */}
                  {messages.length > 0 && suggestions.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className={cn(
                            "px-3 transition-all duration-200",
                            showSuggestions && "bg-primary/10 border-primary/50"
                          )}
                        >
                          <Lightbulb className={cn(
                            "w-4 h-4",
                            showSuggestions ? "text-primary" : "text-muted-foreground"
                          )} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {showSuggestions ? "Hide" : "Show"} Suggestions
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!inputValue.trim() || isLoading}
                      className="px-3 transition-all duration-200"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>      {/* Consent Dialog */}
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
    </>
  );
}
