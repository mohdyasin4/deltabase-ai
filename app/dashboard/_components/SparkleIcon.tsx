import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const AnimatedSparkles = () => {
  return (
    <motion.div
      initial={{ opacity: 0.8, scale: 1, y: 0, rotate: 0 }}
      animate={{
        opacity: [0.6, 1, 0.6], // Glowing effect
        scale: [1, 1.2, 1], // Pulsing effect
        y: [0, -5, 0, 5, 0], // Floating up & down
        rotate: [-5, 0, 5, 0, -5], // Slight rotation effect
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="mb-6 left-1/2 transform -translate-x-1/2"
      >
      <Sparkles
        size={50}
        strokeWidth={1.5}
        fill="white"
        className="bg-clip-text"
        style={{
          filter: "drop-shadow(0px 0px 12px #ffcc19)", // Stronger Glow Effect
        }}
      />
    </motion.div>
  );
};

export default AnimatedSparkles;
