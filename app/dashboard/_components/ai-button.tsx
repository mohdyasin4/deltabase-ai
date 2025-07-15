import { RainbowButton } from "@/app/dashboard/_components/rainbow-button";
import { Sparkles } from "lucide-react";

interface AIButtonProps {
  handleAiButtonClick: () => void;
}
const AIButton = ({ handleAiButtonClick }: AIButtonProps) => {
  return (
    <RainbowButton
      className="h-8 w-fit p-2 gap-2 text-foreground hover:text-primary transition-all ease-in-out rounded-[0.5rem]"
      onClick={handleAiButtonClick}
    >
      <Sparkles height={20} width={20} />
      Ask AI
    </RainbowButton>
  );
};

export default AIButton;