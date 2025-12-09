import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPlus, ChevronDown } from "lucide-react";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateICalFile,
  generateYahooCalendarUrl,
} from "@/utils/calendarUtils";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddToCalendarButtonProps {
  title: string;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  description?: string | null;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  compact?: boolean;
}

export const AddToCalendarButton = ({
  title,
  startDate,
  endDate,
  location,
  description,
  variant = "outline",
  size = "default",
  className = "",
  compact = false,
}: AddToCalendarButtonProps) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const eventParams = { title, startDate, endDate, location, description };

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(eventParams);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleOutlookCalendar = () => {
    const url = generateOutlookCalendarUrl(eventParams);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleAppleCalendar = () => {
    generateICalFile(eventParams);
    setOpen(false);
  };

  const handleYahooCalendar = () => {
    const url = generateYahooCalendarUrl(eventParams);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const buttonText = language === "ja" 
    ? "カレンダーに追加" 
    : language === "pt" 
    ? "Adicionar ao Calendário" 
    : "Add to Calendar";

  if (compact) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button 
            className={`inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{buttonText}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleGoogleCalendar} className="gap-2">
            <img src="/images/google-calendar-logo.png" alt="Google" className="h-4 w-4" />
            Google Calendar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAppleCalendar} className="gap-2">
            <span className="text-base">📅</span>
            Apple / iCal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOutlookCalendar} className="gap-2">
            <span className="text-base">📧</span>
            Outlook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleYahooCalendar} className="gap-2">
            <span className="text-base">📆</span>
            Yahoo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={`w-full ${className}`}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          {buttonText}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem onClick={handleGoogleCalendar} className="gap-3 py-2.5">
          <img src="/images/google-calendar-logo.png" alt="Google" className="h-5 w-5" />
          <span>Google Calendar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAppleCalendar} className="gap-3 py-2.5">
          <span className="text-lg">📅</span>
          <span>Apple Calendar / iCal</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlookCalendar} className="gap-3 py-2.5">
          <span className="text-lg">📧</span>
          <span>Outlook.com</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleYahooCalendar} className="gap-3 py-2.5">
          <span className="text-lg">📆</span>
          <span>Yahoo Calendar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
