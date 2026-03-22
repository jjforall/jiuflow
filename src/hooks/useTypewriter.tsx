import { useState, useEffect, useCallback } from "react";

interface UseTypewriterOptions {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
  loop?: boolean;
}

export const useTypewriter = ({
  texts,
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseTime = 2000,
  loop = true,
}: UseTypewriterOptions) => {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const currentText = texts[textIndex] || "";

  useEffect(() => {
    if (texts.length === 0) return;

    let timeout: ReturnType<typeof setTimeout>;

    if (isTyping) {
      if (displayText.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        // Finished typing, pause before deleting
        timeout = setTimeout(() => {
          if (loop || textIndex < texts.length - 1) {
            setIsTyping(false);
          } else {
            setIsComplete(true);
          }
        }, pauseTime);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, deletingSpeed);
      } else {
        // Finished deleting, move to next text
        setTextIndex((prev) => (prev + 1) % texts.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, currentText, texts, textIndex, typingSpeed, deletingSpeed, pauseTime, loop]);

  return {
    displayText,
    isTyping,
    isComplete,
    currentTextIndex: textIndex,
  };
};
