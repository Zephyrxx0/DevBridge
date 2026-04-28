import { NextResponse } from "next/server";
import { codeToHtml } from "shiki";

type HighlightPayload = {
  code: string;
  language?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HighlightPayload;
    const code = body.code ?? "";
    const language = body.language ?? "text";

    const html = await codeToHtml(code, {
      lang: language,
      theme: "github-dark",
    });

    return NextResponse.json({ html });
  } catch {
    return NextResponse.json({ html: "" }, { status: 200 });
  }
}
