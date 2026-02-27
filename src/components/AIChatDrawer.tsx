import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat, AIMessage } from '@/hooks/useAIChat';
import { supabase } from '@/integrations/supabase/client';
import { Send, Plus, MessageSquare, Loader2, Bot, User, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContext?: any;
  initialMessage?: string;
  initialImageUrl?: string;
  contextType?: string;
  contextId?: string;
}

const SUGGESTIONS = [
  'حلل هذا المنتج',
  'لماذا المنتج خاسر؟',
  'كيف أرفع نسبة التوصيل؟',
  'هل أزيد الميزانية؟',
  'اقترح زوايا إعلانية',
  'ما هي المنتجات الخاسرة؟',
];

export default function AIChatDrawer({ open, onOpenChange, initialContext, initialMessage, initialImageUrl, contextType, contextId }: AIChatDrawerProps) {
  const { messages, isLoading, sendMessage, resetChat, loadConversation, conversationId } = useAIChat();
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    if (open && initialMessage && !sentInitial.current && messages.length === 0) {
      sentInitial.current = true;
      sendMessage(initialMessage, initialContext, initialImageUrl);
    }
  }, [open, initialMessage]);

  useEffect(() => {
    if (!open) sentInitial.current = false;
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    setConversations(data || []);
    setShowHistory(true);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim(), initialContext);
    setInput('');
  };

  const handleNewChat = () => {
    resetChat();
    setShowHistory(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              المستشار الذكي
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={fetchHistory} title="سجل المحادثات">
                <History className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNewChat} title="محادثة جديدة">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {showHistory ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">سجل المحادثات</h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد محادثات سابقة</p>
            ) : (
              conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => { loadConversation(c.id); setShowHistory(false); }}
                  className="w-full text-right p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleDateString('ar')}</p>
                </button>
              ))
            )}
            <Button variant="outline" className="w-full mt-4" onClick={() => setShowHistory(false)}>العودة للمحادثة</Button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">مرحباً! أنا مستشارك الذكي</h3>
                    <p className="text-sm text-muted-foreground">اسألني أي شيء عن منتجاتك وأدائك</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s, initialContext)}
                        className="text-xs p-2.5 rounded-lg bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground text-right"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">يفكر...</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/50 shrink-0">
              <form
                onSubmit={e => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  className="input-field flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isUser ? 'bg-primary/20' : 'bg-muted'}`}>
        {isUser ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
