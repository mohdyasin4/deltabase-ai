"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TextCypherProps {
  text: string;
  duration?: number;
  className?: string;
  onComplete?: () => void;
}

export default function TextCypher({ 
  text, 
  duration = 2000, 
  className = "",
  onComplete 
}: TextCypherProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  
  useEffect(() => {
    if (currentIndex >= text.length) {
      onComplete?.();
      return;
    }
    
    const interval = setInterval(() => {
      setDisplayText(prev => {
        const revealed = text.slice(0, currentIndex);
        const randomChar = chars[Math.floor(Math.random() * chars.length)];
        return revealed + randomChar;
      });
    }, 50);
    
    const revealTimeout = setTimeout(() => {
      setDisplayText(text.slice(0, currentIndex + 1));
      setCurrentIndex(prev => prev + 1);
    }, duration / text.length);
    
    return () => {
      clearInterval(interval);
      clearTimeout(revealTimeout);
    };
  }, [currentIndex, text, duration, chars, onComplete]);
  
  return (
    <motion.span 
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {displayText}
    </motion.span>
  );
}
