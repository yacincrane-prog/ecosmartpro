import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AIMessage = { role: 'user' | 'assistant'; content: string; imageUrl?: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function useAIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const createConversation = useCallback(async (title: string, contextType = 'general', contextId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, title, context_type: contextType, context_id: contextId })
      .select()
      .single();

    if (error) { console.error(error); return null; }
    setConversationId(data.id);
    setMessages([]);
    return data.id;
  }, []);

  const loadConversation = useCallback(async (convId: string) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }
    setConversationId(convId);
    setMessages((data || []).map((m: any) => ({ role: m.role, content: m.content })));
  }, []);

  const saveMessage = useCallback(async (convId: string, role: string, content: string) => {
    await supabase.from('ai_messages').insert({ conversation_id: convId, role, content });
  }, []);

  const saveToMemory = useCallback(async (summary: string, decision?: string, productId?: string, contextData?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('ai_analysis_memory').insert({
      user_id: user.id, product_id: productId, summary, decision, context_data: contextData,
    });
  }, []);

  const sendMessage = useCallback(async (input: string, contextData?: any, imageUrl?: string) => {
    let convId = conversationId;
    if (!convId) {
      convId = await createConversation(input.substring(0, 50));
      if (!convId) return;
    }

    const userMsg: AIMessage = { role: 'user', content: input, imageUrl };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    await saveMessage(convId, 'user', input);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content, ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}) })),
          contextData,
          conversationId: convId,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'خطأ غير معروف' }));
        toast.error(err.error || 'خطأ في المساعد الذكي');
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }

      if (assistantSoFar) {
        await saveMessage(convId, 'assistant', assistantSoFar);
      }
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ في الاتصال بالمساعد الذكي');
    } finally {
      setIsLoading(false);
    }
  }, [messages, conversationId, createConversation, saveMessage]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages, isLoading, conversationId, sendMessage, resetChat,
    createConversation, loadConversation, saveToMemory, setMessages,
  };
}
