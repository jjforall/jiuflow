import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  User, 
  Send, 
  Trash2, 
  RefreshCw,
  Settings,
  Sparkles
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  timestamp: Date;
}

const AI_PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI (内蔵)', models: [
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'openai/gpt-5', label: 'GPT-5' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  ]},
  { value: 'openai', label: 'OpenAI', models: [
    { value: 'gpt-5-2025-08-07', label: 'GPT-5' },
    { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ]},
  { value: 'anthropic', label: 'Anthropic', models: [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ]},
  { value: 'groq', label: 'Groq', models: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  ]},
  { value: 'perplexity', label: 'Perplexity', models: [
    { value: 'sonar', label: 'Sonar' },
    { value: 'sonar-pro', label: 'Sonar Pro' },
    { value: 'sonar-reasoning', label: 'Sonar Reasoning' },
  ]},
];

export default function McpChatManagement() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState('lovable');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentProvider = AI_PROVIDERS.find(p => p.value === provider);
  const availableModels = currentProvider?.models || [];

  useEffect(() => {
    // Set default model when provider changes
    if (availableModels.length > 0 && !availableModels.find(m => m.value === model)) {
      setModel(availableModels[0].value);
    }
  }, [provider, availableModels, model]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get API keys from localStorage (new format: array of {name, key})
      const savedKeys = localStorage.getItem('mcp_api_keys');
      let apiKeys: Record<string, string> = {};
      if (savedKeys) {
        const parsed = JSON.parse(savedKeys);
        if (Array.isArray(parsed)) {
          // New format - map common key names to provider format
          parsed.forEach((k: { name: string; key: string }) => {
            const normalizedName = k.name.toUpperCase().replace(/[\s-]/g, '_');
            // Map to standard API key names
            if (normalizedName.includes('OPENAI') || normalizedName.includes('GPT')) {
              apiKeys['OPENAI_API_KEY'] = k.key;
            } else if (normalizedName.includes('ANTHROPIC') || normalizedName.includes('CLAUDE')) {
              apiKeys['ANTHROPIC_API_KEY'] = k.key;
            } else if (normalizedName.includes('GROQ') || normalizedName.includes('LLAMA')) {
              apiKeys['GROQ_API_KEY'] = k.key;
            } else if (normalizedName.includes('PERPLEXITY') || normalizedName.includes('SONAR')) {
              apiKeys['PERPLEXITY_API_KEY'] = k.key;
            } else {
              // Store with original name as fallback
              apiKeys[k.name] = k.key;
            }
          });
        } else {
          // Old format (object)
          apiKeys = parsed;
        }
      }

      const response = await supabase.functions.invoke('mcp-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          provider,
          model,
          apiKeys,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data.content || 'No response received',
        provider: `${provider}/${model}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('メッセージの送信に失敗しました', {
        description: error instanceof Error ? error.message : '不明なエラー',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('チャット履歴をクリアしました');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          MCP チャット
        </h2>
        <p className="text-muted-foreground">
          様々なAIプロバイダーとチャットできます
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">プロバイダー</label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">モデル</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearChat}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              履歴クリア
            </Button>

            {provider !== 'lovable' && (
              <p className="text-xs text-muted-foreground">
                ※ 外部プロバイダーを使用するには、設定画面でAPIキーを設定してください
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                チャット
              </span>
              <Badge variant="secondary">
                {currentProvider?.label} / {availableModels.find(m => m.value === model)?.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>メッセージを入力して会話を始めましょう</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        {message.provider && (
                          <p className="text-xs opacity-70 mt-1">{message.provider}</p>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力... (Shift+Enterで改行)"
                className="min-h-[60px] resize-none"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!input.trim() || isLoading}
                className="h-auto"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
