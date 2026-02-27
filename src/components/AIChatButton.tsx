import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AIChatDrawer from './AIChatDrawer';

interface AIChatButtonProps {
  context?: any;
}

export default function AIChatButton({ context }: AIChatButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <Bot className="h-6 w-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">اسأل مساعدك الذكي</TooltipContent>
      </Tooltip>

      <AIChatDrawer open={open} onOpenChange={setOpen} initialContext={context} />
    </>
  );
}
