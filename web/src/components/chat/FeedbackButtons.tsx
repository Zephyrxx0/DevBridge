"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";

type FeedbackValue = "helpful" | "not_helpful";

interface FeedbackButtonsProps {
  messageIndex: number;
  messagePreview: string;
}

export function FeedbackButtons({ messageIndex, messagePreview }: FeedbackButtonsProps) {
  const [value, setValue] = useState<FeedbackValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (nextValue: FeedbackValue) => {
    setValue(nextValue);
    setIsSubmitting(true);
    try {
      await fetch("/api/backend/feedback/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_index: messageIndex, value: nextValue, preview: messagePreview.slice(0, 240) }),
      });
    } catch {
      // Ignore network failures; UI state still captured locally.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        type="button"
        size="icon-sm"
        variant={value === "helpful" ? "secondary" : "outline"}
        aria-pressed={value === "helpful"}
        onClick={() => submitFeedback("helpful")}
        disabled={isSubmitting}
        className="group h-8 w-8 min-w-8 justify-start overflow-hidden px-2 transition-all duration-200 hover:w-fit"
        title="Helpful"
      >
        <ThumbsUp className="size-3.5 shrink-0" />
        <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-[0.75rem] opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-16 group-hover:opacity-100">
          Helpful
        </span>
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={value === "not_helpful" ? "secondary" : "outline"}
        aria-pressed={value === "not_helpful"}
        onClick={() => submitFeedback("not_helpful")}
        disabled={isSubmitting}
        className="group h-8 w-8 min-w-8 justify-start overflow-hidden px-2 transition-all duration-200 hover:w-fit"
        title="Not Helpful"
      >
        <ThumbsDown className="size-3.5 shrink-0" />
        <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-[0.75rem] opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-24 group-hover:opacity-100">
          Not Helpful
        </span>
      </Button>
    </div>
  );
}
