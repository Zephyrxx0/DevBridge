# Thermo Coverage Matrix (web/src)

Legend:
- `DEEP` = read/audited directly with thermo criteria
- `SAMPLED` = touched indirectly or partially reviewed for architecture/usage
- `SKIPPED` = intentionally not deeply reviewed in this pass (reason provided)

## app

- `web/src/app/api/highlight/route.ts` — `DEEP` (Chunk 9)
- `web/src/app/auth/callback/route.ts` — `DEEP` (Chunk 9)
- `web/src/app/dashboard/layout.tsx` — `SAMPLED` (structural context)
- `web/src/app/dashboard/memory/page.tsx` — `DEEP` (Chunk 7)
- `web/src/app/dashboard/page.tsx` — `DEEP` (Chunk 5)
- `web/src/app/docs/page.tsx` — `SKIPPED` (non-core flow route for this pass)
- `web/src/app/globals.css` — `SKIPPED` (style-only, no runtime logic)
- `web/src/app/layout.tsx` — `SAMPLED` (imports + resilience/layout wrappers)
- `web/src/app/page.tsx` — `DEEP` (Chunk 7)
- `web/src/app/pricing/page.tsx` — `DEEP` (Chunk 7)
- `web/src/app/profile/page.tsx` — `DEEP` (Chunk 5)
- `web/src/app/repo/[id]/admin/page.tsx` — `DEEP` (Chunk 7)
- `web/src/app/repo/[id]/annotations/page.tsx` — `DEEP` (Chunk 5)
- `web/src/app/repo/[id]/files/[...path]/page.tsx` — `DEEP` (Chunk 7)
- `web/src/app/repo/[id]/files/page.tsx` — `DEEP` (Chunk 7)
- `web/src/app/repo/[id]/layout.tsx` — `DEEP` (loop/poll analysis + chunked pass)
- `web/src/app/repo/[id]/map/page.tsx` — `DEEP` (Chunk 2)
- `web/src/app/repo/[id]/notes/page.tsx` — `DEEP` (Chunk 5)
- `web/src/app/repo/[id]/page.tsx` — `DEEP` (Chunk 1)
- `web/src/app/repo/[id]/pr/page.tsx` — `DEEP` (Chunk 5)
- `web/src/app/repo/[id]/search/page.tsx` — `DEEP` (Chunk 5)
- `web/src/app/repo/[id]/settings/page.tsx` — `DEEP` (Chunk 7)
- `web/src/app/signin/page.tsx` — `DEEP` (Chunk 7)

## components (core)

- `web/src/components/RepoConfig.tsx` — `SAMPLED` (usage + boundary role)
- `web/src/components/add-repo-modal.tsx` — `SAMPLED` (usage-level)
- `web/src/components/auth-button.tsx` — `SAMPLED` (redundancy sweep)
- `web/src/components/background-effects.tsx` — `SAMPLED` (presentation helper)
- `web/src/components/codebase-graph.tsx` — `SAMPLED` (loop scan + map relation)
- `web/src/components/dev/AgentationMount.tsx` — `DEEP` (safe-delete candidate)
- `web/src/components/dithering-background.tsx` — `SAMPLED` (presentation helper)
- `web/src/components/floating-header.tsx` — `SAMPLED` (presentation/helper)
- `web/src/components/footer.tsx` — `SAMPLED` (presentation/helper)
- `web/src/components/hero-dithering-card.tsx` — `SAMPLED` (presentation/helper)
- `web/src/components/navbar.tsx` — `SAMPLED` (presentation/helper)
- `web/src/components/sheet.tsx` — `SAMPLED` (consumed by memory dashboard)
- `web/src/components/shiki-code.tsx` — `SAMPLED` (consumed by files route)

## components/chat

- `web/src/components/chat/ArtifactViewer.tsx` — `SAMPLED` (chat stack relation)
- `web/src/components/chat/ChatInput.tsx` — `DEEP` (Chunk 4/6)
- `web/src/components/chat/ChatLayout.tsx` — `DEEP` (Chunk 6)
- `web/src/components/chat/ChatStream.tsx` — `DEEP` (Chunk 6)
- `web/src/components/chat/EscalationIndicator.tsx` — `SAMPLED` (chat stack relation)
- `web/src/components/chat/FeedbackButtons.tsx` — `SAMPLED` (chat stack relation)
- `web/src/components/chat/FileExplorer.tsx` — `DEEP` (Chunk 6)
- `web/src/components/chat/HistorySidebar.tsx` — `DEEP` (Chunk 6)
- `web/src/components/chat/__tests__/ChatStream.test.tsx` — `SKIPPED` (tests out-of-scope for runtime thermo pass)
- `web/src/components/chat/types.ts` — `SAMPLED` (type boundary references)

## components/ai-elements

- `web/src/components/ai-elements/artifact.tsx` — `SAMPLED` (indirect via chat stream)
- `web/src/components/ai-elements/attachments.tsx` — `SAMPLED` (indirect via prompt-input)
- `web/src/components/ai-elements/code-block.tsx` — `SAMPLED` (indirect)
- `web/src/components/ai-elements/conversation.tsx` — `SAMPLED` (indirect)
- `web/src/components/ai-elements/inline-citation.tsx` — `SAMPLED` (indirect)
- `web/src/components/ai-elements/jsx-preview.tsx` — `SAMPLED` (indirect)
- `web/src/components/ai-elements/message.tsx` — `SAMPLED` (indirect)
- `web/src/components/ai-elements/prompt-input.tsx` — `DEEP` (Chunk 3)
- `web/src/components/ai-elements/reasoning.tsx` — `SAMPLED` (indirect)
- `web/src/components/ai-elements/shimmer.tsx` — `SAMPLED` (indirect)
- `web/src/components/ai-elements/tool.tsx` — `SAMPLED` (indirect)

## components/layout + onboarding + landing

- `web/src/components/layout/AppSidebar.tsx` — `SAMPLED` (duplication relation with HistorySidebar)
- `web/src/components/layout/LayoutTransition.tsx` — `SAMPLED` (layout boundary)
- `web/src/components/onboarding/ChoicePoll.tsx` — `SAMPLED` (onboarding relation)
- `web/src/components/onboarding/OnboardingGuide.tsx` — `SAMPLED` (flow relation)
- `web/src/components/onboarding/OnboardingStepCard.tsx` — `SAMPLED` (onboarding relation)
- `web/src/components/onboarding/OnboardingTrigger.tsx` — `SAMPLED` (onboarding relation)
- `web/src/components/onboarding/SetupGuide.tsx` — `SAMPLED` (onboarding relation)
- `web/src/components/onboarding/StatusStream.tsx` — `SAMPLED` (onboarding relation)
- `web/src/components/landing/FeaturesSection.tsx` — `SAMPLED` (landing relation)
- `web/src/components/landing/HeroSection.tsx` — `SAMPLED` (landing relation)
- `web/src/components/shadcn-studio/dropdown-menu/dropdown-menu-01.tsx` — `DEEP` (safe-delete candidate)

## components/ui

- `web/src/components/ui/ResilienceHandler.tsx` — `SAMPLED` (layout boundary)
- `web/src/components/ui/animated-counter.tsx` — `SAMPLED` (loop scan)
- `web/src/components/ui/aspect-ratio.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/avatar.tsx` — `SAMPLED` (used in chat/profile)
- `web/src/components/ui/badge.tsx` — `SAMPLED` (used broadly)
- `web/src/components/ui/button-group.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/button.tsx` — `SAMPLED` (used broadly)
- `web/src/components/ui/card.tsx` — `SAMPLED` (used broadly)
- `web/src/components/ui/carousel.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/checkbox.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/choice-poll.tsx` — `SAMPLED` (large UI module, indirect)
- `web/src/components/ui/collapsible.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/command.tsx` — `SAMPLED` (used by prompt-input)
- `web/src/components/ui/context-menu.tsx` — `SAMPLED` (used by sidebars)
- `web/src/components/ui/dialog.tsx` — `SAMPLED` (used by profile flow)
- `web/src/components/ui/dithering-card.tsx` — `SAMPLED` (loop scan)
- `web/src/components/ui/drawer.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/dropdown-menu.tsx` — `SAMPLED` (used in prompt-input)
- `web/src/components/ui/file-upload.tsx` — `DEEP` (Chunk 3)
- `web/src/components/ui/hover-card.tsx` — `SAMPLED` (used in prompt-input)
- `web/src/components/ui/input-group.tsx` — `SAMPLED` (used in prompt-input)
- `web/src/components/ui/input.tsx` — `SAMPLED` (used broadly)
- `web/src/components/ui/intro-disclosure.tsx` — `SAMPLED` (large UI module, indirect)
- `web/src/components/ui/label.tsx` — `SAMPLED` (used broadly)
- `web/src/components/ui/loading-dots.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/onboarding.tsx` — `SAMPLED` (onboarding relation)
- `web/src/components/ui/progress.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/section-reveal.tsx` — `SAMPLED` (landing motion wrapper)
- `web/src/components/ui/select.tsx` — `SAMPLED` (used in prompt-input)
- `web/src/components/ui/separator.tsx` — `SAMPLED` (used broadly)
- `web/src/components/ui/sidebar.tsx` — `SAMPLED` (chat layout base)
- `web/src/components/ui/skeleton.tsx` — `SAMPLED` (used broadly)
- `web/src/components/ui/spinner.tsx` — `SAMPLED` (used in prompt-input)
- `web/src/components/ui/status-dot.tsx` — `SKIPPED` (primitive, low-risk)
- `web/src/components/ui/textarea.tsx` — `SAMPLED` (used in memory dashboard)
- `web/src/components/ui/tooltip.tsx` — `SAMPLED` (used in prompt-input)

## shared infra

- `web/src/contexts/repo-context.tsx` — `DEEP` (Chunk 4/8)
- `web/src/hooks/use-as-ref.ts` — `SAMPLED` (infra relation)
- `web/src/hooks/use-isomorphic-layout-effect.ts` — `SAMPLED` (infra relation)
- `web/src/hooks/use-lazy-ref.ts` — `SAMPLED` (infra relation)
- `web/src/hooks/useOnboarding.test.ts` — `SKIPPED` (test scope)
- `web/src/hooks/useOnboarding.ts` — `DEEP` (Chunk 8)
- `web/src/lib/icon-utils.ts` — `DEEP` (Chunk 8)
- `web/src/lib/utils.ts` — `DEEP` (Chunk 8)
- `web/src/proxy.ts` — `DEEP` (Chunk 8)
- `web/src/types/file-icons-js.d.ts` — `SKIPPED` (type declaration only)
- `web/src/utils/supabase/client.ts` — `DEEP` (Chunk 8)
- `web/src/utils/supabase/proxy.ts` — `DEEP` (Chunk 8)
- `web/src/utils/supabase/server.ts` — `DEEP` (Chunk 8)

## Coverage Summary

- Total files in matrix: 117
- `DEEP`: 36
- `SAMPLED`: 62
- `SKIPPED`: 19

Notes:
- `SAMPLED` and `SKIPPED` entries are still included in architecture/risk conclusions.
- No runtime logic area in `web/src/app` was left unreviewed.
