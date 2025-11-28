import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: "match" | "seminar";
  event_date: string;
  location: string | null;
  price: number;
  max_participants: number | null;
  organizer_id: string;
}

interface EventCardProps {
  event: Event;
  onRegister: (eventId: string) => void;
  isRegistered?: boolean;
  registrationCount?: number;
}

export const EventCard = ({ event, onRegister, isRegistered, registrationCount }: EventCardProps) => {
  const { language } = useLanguage();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      language === "ja" ? "ja-JP" : language === "pt" ? "pt-BR" : "en-US",
      { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );
  };

  const getEventTypeLabel = () => {
    if (event.event_type === "match") {
      return language === "ja" ? "試合" : language === "pt" ? "Luta" : "Match";
    }
    return language === "ja" ? "セミナー" : language === "pt" ? "Seminário" : "Seminar";
  };

  const getEventIcon = () => {
    return event.event_type === "match" ? <Trophy className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />;
  };

  const isFull = event.max_participants && registrationCount ? registrationCount >= event.max_participants : false;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant={event.event_type === "match" ? "default" : "secondary"} className="gap-1">
            {getEventIcon()}
            {getEventTypeLabel()}
          </Badge>
          {event.price > 0 && (
            <span className="text-lg font-bold">¥{event.price.toLocaleString()}</span>
          )}
          {event.price === 0 && (
            <Badge variant="outline">{language === "ja" ? "無料" : "Free"}</Badge>
          )}
        </div>
        <CardTitle className="text-xl">{event.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {event.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">{event.description}</p>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event.event_date)}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          )}
          
          {event.max_participants && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                {registrationCount || 0} / {event.max_participants}{" "}
                {language === "ja" ? "名" : "participants"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        {isRegistered ? (
          <Button disabled className="w-full" variant="outline">
            {language === "ja" ? "登録済み" : language === "pt" ? "Registrado" : "Registered"}
          </Button>
        ) : isFull ? (
          <Button disabled className="w-full">
            {language === "ja" ? "満員" : language === "pt" ? "Lotado" : "Full"}
          </Button>
        ) : (
          <Button onClick={() => onRegister(event.id)} className="w-full">
            {language === "ja" ? "申し込む" : language === "pt" ? "Inscrever-se" : "Register"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
