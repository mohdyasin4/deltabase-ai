"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WordRotateProps {
  words: string[];
  duration?: number;
  className?: string;
  loop?: boolean;
}

export default function WordRotate({ 
  words, 
  duration = 2000, 
  className = "",
  loop = true 
}: WordRotateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (!loop && currentIndex >= words.length - 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => loop ? (prev + 1) % words.length : Math.min(prev + 1, words.length - 1));
    }, duration);
    
    return () => clearInterval(interval);
  }, [currentIndex, duration, words.length, loop]);
  
  return (
    <div className={`relative inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 10, rotateX: 90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, y: -10, rotateX: -90 }}
          transition={{ 
            duration: 0.3,
            ease: "easeInOut"
          }}
          className="block"
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
