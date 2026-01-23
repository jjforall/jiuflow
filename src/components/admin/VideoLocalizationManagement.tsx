import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Languages } from "lucide-react";
import { TranscriptionManagement } from "./TranscriptionManagement";
import { VideoTranslationManagement } from "./VideoTranslationManagement";

export const VideoLocalizationManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Languages className="h-6 w-6" />
          動画ローカライズ管理
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          文字起こし、字幕生成、多言語翻訳を一括管理します
        </p>
      </div>

      <Tabs defaultValue="transcription" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="transcription" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            文字起こし・字幕
          </TabsTrigger>
          <TabsTrigger value="translation" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            翻訳・吹き替え
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcription" className="mt-6">
          <TranscriptionManagement showHeader={false} />
        </TabsContent>

        <TabsContent value="translation" className="mt-6">
          <VideoTranslationManagement showHeader={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
