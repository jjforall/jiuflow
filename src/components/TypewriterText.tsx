import { useTypewriter } from "@/hooks/useTypewriter";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  texts: string[];
  className?: string;
  cursorClassName?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
  loop?: boolean;
  showCursor?: boolean;
}

export const TypewriterText = ({
  texts,
  className,
  cursorClassName,
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseTime = 2500,
  loop = true,
  showCursor = true,
}: TypewriterTextProps) => {
  const { displayText, isTyping } = useTypewriter({
    texts,
    typingSpeed,
    deletingSpeed,
    pauseTime,
    loop,
  });

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span>{displayText}</span>
      {showCursor && (
        <span
          className={cn(
            "inline-block w-[3px] h-[1em] ml-1 bg-current animate-pulse",
            isTyping ? "opacity-100" : "opacity-70",
            cursorClassName
          )}
          style={{ animationDuration: "0.7s" }}
        />
      )}
    </span>
  );
};
