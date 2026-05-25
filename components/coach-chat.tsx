"use client";

import { FormEvent, useState, useTransition } from "react";
import { Bot, Send, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/loading-state";
import { getMockCoachReply } from "@/lib/workout/coach";
import { cn, createId } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "coach";
  content: string;
};

const starters = [
  "I only have 20 minutes today",
  "My legs are sore",
  "What should I eat after lifting?",
  "The gym is packed"
];

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "coach",
      content:
        "Tell me what changed today. Time, soreness, equipment, energy, gym chaos. We'll adjust without drama."
    }
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function askCoach(content: string) {
    if (!content.trim()) return;
    const userMessage: Message = { id: createId("message"), role: "user", content };
    setMessages((current) => [...current, userMessage]);
    setInput("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content })
        });
        const data = (await response.json()) as { reply?: string };
        setMessages((current) => [
          ...current,
          { id: createId("message"), role: "coach", content: data.reply ?? getMockCoachReply(content) }
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          { id: createId("message"), role: "coach", content: getMockCoachReply(content) }
        ]);
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askCoach(input);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="min-h-[620px]">
        <CardContent className="flex min-h-[620px] flex-col p-4">
          <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === "user" && "justify-end")}
              >
                {message.role === "coach" ? (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6",
                    message.role === "coach"
                      ? "bg-white/[0.06] text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" ? (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                    <UserRound className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
            ))}
            {isPending ? <LoadingState label="Coach is adapting" /> : null}
          </div>
          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about time, soreness, food, or a packed gym..."
              aria-label="Message coach"
            />
            <Button type="submit" size="icon" disabled={isPending || !input.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-semibold text-white">Try asking</h2>
          {starters.map((starter) => (
            <Button
              key={starter}
              variant="outline"
              className="h-auto w-full justify-start whitespace-normal text-left text-muted-foreground"
              onClick={() => askCoach(starter)}
            >
              {starter}
            </Button>
          ))}
          <div className="rounded-2xl border border-accent/20 bg-accent/10 p-3 text-xs leading-5 text-muted-foreground">
            OpenAI API route structure is ready. Responses are mocked locally until the API key and live call are enabled.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
