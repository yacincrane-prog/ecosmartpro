import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';
import ReactMarkdown from 'react-markdown';
import AIChatDrawer from './AIChatDrawer';

interface AIInsightsCardProps {
  contextData: any;
}

export default function AIInsightsCard({ contextData }: AIInsightsCardProps) {
  const { messages, isLoading, sendMessage, resetChat } = useAIChat();
  const [generated, setGenerated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleGenerate = async () => {
    resetChat();
    setGenerated(true);
    await sendMessage(
      'قدم لي ملخصاً ذكياً سريعاً لأداء حسابي الكامل، مع تحذيرات للمنتجات الخاسرة واقتراحات تحسين. اجعل الرد مختصراً ومركزاً.',
      contextData
    );
  };

  const lastAssistant = messages.filter(m => m.role === 'assistant').pop();

  return (
    <>
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!generated ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">احصل على تحليل ذكي شامل لأداء حسابك</p>
              <Button onClick={handleGenerate} variant="outline" size="sm" className="gap-2">
                <Bot className="h-4 w-4" />
                تحليل الآن
              </Button>
            </div>
          ) : isLoading && !lastAssistant ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">يحلل بياناتك...</span>
            </div>
          ) : lastAssistant ? (
            <div className="space-y-3">
              <div className="prose prose-sm prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 max-h-64 overflow-y-auto">
                <ReactMarkdown>{lastAssistant.content}</ReactMarkdown>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(true)} className="w-full text-primary">
                <Bot className="h-4 w-4 ml-1" />
                ناقش المزيد
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AIChatDrawer open={drawerOpen} onOpenChange={setDrawerOpen} initialContext={contextData} />
    </>
  );
}
