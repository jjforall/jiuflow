import * as React from "react";
import { Input } from "./input";
import { Command, CommandGroup, CommandItem, CommandList } from "./command";
import { cn } from "@/lib/utils";

interface InputWithSuggestionsProps extends React.ComponentProps<"input"> {
  suggestions: string[];
  onSelectSuggestion?: (value: string) => void;
}

export const InputWithSuggestions = React.forwardRef<HTMLInputElement, InputWithSuggestionsProps>(
  ({ suggestions, onSelectSuggestion, className, value, onChange, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
      const inputValue = (value as string) || '';
      if (inputValue.length > 0) {
        const filtered = suggestions
          .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()))
          .slice(0, 5);
        setFilteredSuggestions(filtered);
      } else {
        setFilteredSuggestions(suggestions.slice(0, 5));
      }
    }, [value, suggestions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      setShowSuggestions(true);
    };

    const handleSelectSuggestion = (suggestion: string) => {
      if (onSelectSuggestion) {
        onSelectSuggestion(suggestion);
      }
      setShowSuggestions(false);
    };

    return (
      <div ref={containerRef} className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          className={className}
          {...props}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
            <Command>
              <CommandList>
                <CommandGroup>
                  {filteredSuggestions.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      value={suggestion}
                      onSelect={() => handleSelectSuggestion(suggestion)}
                      className="cursor-pointer"
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    );
  }
);

InputWithSuggestions.displayName = "InputWithSuggestions";
