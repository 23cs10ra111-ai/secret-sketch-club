import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/stores/gameStore";

interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  disabled: boolean;
  disabledReason?: string;
}

const GameChat = ({ messages, onSendMessage, disabled, disabledReason }: GameChatProps) => {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm font-hand ${
                msg.is_system
                  ? "text-muted-foreground italic text-center"
                  : msg.is_correct
                  ? "text-sketch-green font-bold"
                  : "text-foreground"
              }`}
            >
              {!msg.is_system && (
                <span className="font-semibold text-primary">{msg.username}: </span>
              )}
              {msg.message}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={disabled ? disabledReason || "You can't chat" : "Type your guess..."}
          disabled={disabled}
          className="font-hand bg-background"
        />
        <Button onClick={handleSend} disabled={disabled || !text.trim()} size="icon" className="bg-primary">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default GameChat;
