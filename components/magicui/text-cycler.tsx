"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TextCyclerProps {
  words: string[];
  currentIndex?: number;
  className?: string;
  onTransitionComplete?: () => void;
}

export default function TextCycler({ 
  words, 
  currentIndex = 0,
  className = "",
  onTransitionComplete
}: TextCyclerProps) {
  const [displayIndex, setDisplayIndex] = useState(currentIndex);
  useEffect(() => {
    if (currentIndex !== displayIndex) {
      // Add a small delay to ensure smooth transition
      const transitionTimer = setTimeout(() => {
        setDisplayIndex(currentIndex);
        // Call completion callback after the animation completes
        setTimeout(() => {
          onTransitionComplete?.();
        }, 500); // Match the animation duration
      }, 50);
      
      return () => clearTimeout(transitionTimer);
    }
  }, [currentIndex, displayIndex, onTransitionComplete]);

  return (
    <div className={`relative overflow-hidden ${className}`}>      <AnimatePresence mode="wait">
        <motion.div
          key={displayIndex}
          initial={{ 
            opacity: 0,
            filter: "blur(4px)",
          }}
          animate={{ 
            opacity: 1,
            filter: "blur(0px)",
          }}
          exit={{ 
            opacity: 0,
            filter: "blur(4px)",
          }}          transition={{
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1], // More natural easing
          }}
          className="block"
        >
          {words[displayIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
