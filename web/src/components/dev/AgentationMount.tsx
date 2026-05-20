"use client";

export function AgentationMount() {
  const enabled = process.env.NEXT_PUBLIC_AGENTATION_ENABLED === "true";

  if (!enabled || process.env.NODE_ENV !== "development") {
    return null;
  }

  return null;
}
