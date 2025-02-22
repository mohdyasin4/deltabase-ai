import OrbitingCircles from "@/components/magicui/orbiting-circles";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { IconProps } from "@radix-ui/react-icons/dist/types";
import { Brain } from "lucide-react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function OrbitingCirclesComponent() {
  return (
    <div className="relative flex h-[500px] w-full max-w-[32rem] items-center justify-center overflow-hidden rounded-lg">
      <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-500/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
        Unlock Insights
      </span>

      {/* Inner Circles */}
      <OrbitingCircles
        className="h-[30px] w-[30px] border-none bg-transparent"
        duration={20}
        delay={20}
        radius={80}
      >
        <Icons.chart />
      </OrbitingCircles>
      <OrbitingCircles
        className="h-[30px] w-[30px] border-none bg-transparent"
        duration={20}
        delay={10}
        radius={80}
      >
        <Icons.ai />
      </OrbitingCircles>

      {/* Outer Circles (reverse) */}
      <OrbitingCircles
        className="h-[50px] w-[50px] border-none bg-transparent"
        reverse
        radius={190}
        duration={20}
      >
        <Icons.database />
      </OrbitingCircles>
      <OrbitingCircles
        className="h-[50px] w-[50px] border-none bg-transparent"
        reverse
        radius={190}
        duration={20}
        delay={20}
      >
        <Icons.dashboard />
      </OrbitingCircles>
    </div>
  );
}

const Icons = {
  chart: (props: IconProps) => (
    <Image 
      src="/images/369352.svg" // Placeholder for a chart icon
      alt="Chart Icon"
      width={200}
      height={200}
    />
  ),
  ai: (props: IconProps) => (
    <Image
      src="/images/chatgpt-icon.svg"
      alt="AI Icon"
      width={200}
      height={200}
    />
  ),
  database: (props: IconProps) => (
    <Image 
      src="/images/database.png" // Placeholder for a database icon
      alt="Database Icon"
      width={100}
      height={100}
    />
  ),
  dashboard: (props: IconProps) => (
    <Image
      src="/images/dashboard.png"
      alt="Dashboard Icon"
      width={100}
      height={100}
    />
  ),
};
