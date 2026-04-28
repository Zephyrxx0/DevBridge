'use client';

import React from 'react';
import Link from 'next/link';
import { DollarSign, MenuIcon, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Sheet, SheetContent, SheetFooter } from '@/components/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AuthButton } from './auth-button';

export function FloatingHeader() {
	const [open, setOpen] = React.useState(false);
	const [mounted, setMounted] = React.useState(false);
	const [lastRepo, setLastRepo] = React.useState('demo');
	React.useEffect(() => setMounted(true), []);
	React.useEffect(() => {
		const lastRepoId = localStorage.getItem('devbridge.lastRepoId');
		if (lastRepoId) setLastRepo(lastRepoId);
	}, []);
	const { theme, setTheme } = useTheme();
	const isDark = mounted ? theme !== 'light' : true;

	const links = [
		{
			label: 'Workspaces',
			href: '/dashboard',
		},
		{
			label: 'Map',
			href: `/repo/${lastRepo}/map`,
		},
		{
			label: 'Search',
			href: `/repo/${lastRepo}/search`,
		},
		{
			label: 'Annotations',
			href: `/repo/${lastRepo}/annotations`,
		},
		{
			label: 'PRs',
			href: `/repo/${lastRepo}/pr`,
		},
		{
			label: 'Pricing',
			href: '/pricing',
		},
		{
			label: 'Project GitHub',
			href: `https://github.com/${lastRepo}`,
		},
	];

	return (
		<header
			className={cn(
				'sticky top-4 z-50',
				'mx-auto w-full max-w-6xl rounded-2xl',
				'border border-white/[0.08]',
				'bg-[color-mix(in_oklab,var(--surface-1)_25%,transparent)]',
				'backdrop-blur-[24px] backdrop-saturate-[180%]',
				'shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
			)}
		>
			<nav className="mx-auto flex items-center justify-between p-1.5">
				<Link
					href="/"
					className="hover:bg-white/[0.05] flex items-center gap-2 rounded-lg px-2.5 py-2 duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-glow)]"
					aria-label="DevBridge home"
				>
					<div
						className="grid size-9 place-items-center rounded-lg text-white shadow-[0_0_0_1px_var(--brand-muted),0_14px_44px_-26px_var(--brand-glow)]"
						style={{ background: 'var(--brand)' }}
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="m8 3 4 8 5-5 5 15H2L8 3z" />
						</svg>
					</div>
					<div className="leading-none">
						<p className="font-heading text-sm font-semibold tracking-[-0.02em] text-foreground">DevBridge</p>
						<p className="text-xs text-muted-foreground">Codebase intelligence</p>
					</div>
				</Link>
				<div className="hidden items-center gap-1 xl:flex">
					{links.map((link) => (
						<Link key={link.href} className={buttonVariants({ variant: 'ghost', size: 'sm' })} href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noreferrer' : undefined}>
							{link.label}
						</Link>
					))}
				</div>
				<div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-2 py-1 text-xs text-[var(--foreground-muted)] lg:flex">
					<DollarSign className="size-3" />
					<span>Pro trial active</span>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="Toggle theme"
						onClick={() => setTheme(isDark ? 'light' : 'dark')}
						className="border-white/[0.08] bg-[color-mix(in_oklab,var(--surface-2)_30%,transparent)] text-muted-foreground backdrop-blur-sm hover:text-foreground hover:bg-white/[0.06]"
					>
						{mounted ? (isDark ? <Sun className="size-4" /> : <Moon className="size-4" />) : <div className="size-4" />}
					</Button>
					<div className="hidden sm:block">
						<AuthButton />
					</div>
					<Sheet open={open} onOpenChange={setOpen}>
					<Button
						size="icon"
						variant="outline"
						onClick={() => setOpen(!open)}
						className="xl:hidden"
					>
							<MenuIcon className="size-4" />
						</Button>
					<SheetContent
						className="bg-[color-mix(in_oklab,var(--surface-1)_30%,transparent)] gap-0 backdrop-blur-[28px]"
						showClose={false}
						side="left"
					>
							<div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
										{links.map((link) => (
											<Link
												key={link.href}
										className={buttonVariants({
											variant: 'ghost',
											className: 'justify-start',
										})}
												href={link.href}
												target={link.href.startsWith('http') ? '_blank' : undefined}
												rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
											>
										{link.label}
									</Link>
								))}
							</div>
						<SheetFooter>
							<Link href="/dashboard">
								<Button variant="outline" className="w-full">
									Open workspaces
								</Button>
							</Link>
							<Link href={`/repo/${lastRepo}`}>
								<Button className="w-full">View repo map</Button>
							</Link>
						</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
