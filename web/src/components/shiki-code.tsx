"use client";

import { useEffect, useState } from "react";

type Props = {
  code: string;
  language: string;
  className?: string;
};

export function ShikiCode({ code, language, className }: Props) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const response = await fetch("/api/highlight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { html?: string };
        if (active) setHtml(data.html ?? "");
      } catch {
        if (active) setHtml("");
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [code, language]);

  if (!html) {
    return (
      <pre className={className}>
        <code>{code}</code>
      </pre>
    );
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
