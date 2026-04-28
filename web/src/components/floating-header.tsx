'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AuthButton } from './auth-button';

export function FloatingHeader() {
	const [open, setOpen] = React.useState(false);
	const [lastRepo, setLastRepo] = React.useState('demo');
	React.useEffect(() => {
		const lastRepoId = localStorage.getItem('devbridge.lastRepoId');
		if (lastRepoId) setLastRepo(lastRepoId);
	}, []);

	const links = [
		{
			label: 'Workspaces',
			href: '/dashboard',
		},
		{
			label: 'Pricing',
			href: '/pricing',
		},
		{
			label: 'Github',
			href: 'https://github.com/Zephyrxx0/DevBridge',
		},
	];

	return (
		<header
			className={cn(
				'sticky top-4 z-50',
				'mx-auto w-full max-w-5xl rounded-2xl',
				'border border-white/[0.08]',
				'bg-[color-mix(in_oklab,var(--surface-1)_25%,transparent)]',
				'backdrop-blur-[24px] backdrop-saturate-[180%]',
				'shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
			)}
		>
			<nav className="mx-auto flex items-center justify-between px-4 py-2">
				<Link
					href="/"
					className="flex items-center gap-2 rounded-lg px-2.5 py-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-glow)]"
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
					</div>
				</Link>
				<div className="hidden items-center gap-2 xl:flex">
					<DropdownMenu>
						<DropdownMenuTrigger render={<Button variant="ghost" size="sm" nativeButton={false} className="gap-1.5 font-medium text-[var(--foreground)] hover:text-[var(--foreground)]" />}>
							Features <ChevronDown className="size-3.5" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="border-white/10 bg-background/95 backdrop-blur-md">
							<DropdownMenuItem render={<Link href="/docs?feature=map" />} className="cursor-pointer focus:bg-white/5">Map</DropdownMenuItem>
							<DropdownMenuItem render={<Link href="/docs?feature=search" />} className="cursor-pointer focus:bg-white/5">Search</DropdownMenuItem>
							<DropdownMenuItem render={<Link href="/docs?feature=annotations" />} className="cursor-pointer focus:bg-white/5">Annotations</DropdownMenuItem>
							<DropdownMenuItem render={<Link href="/docs?feature=prs" />} className="cursor-pointer focus:bg-white/5">PRs</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					{links.map((link) => (
						<Link key={link.href} className={buttonVariants({ variant: 'ghost', size: 'sm' })} href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noreferrer' : undefined}>
							{link.label}
						</Link>
					))}
				</div>
				<div className="flex items-center gap-3 pr-1">
					<div className="hidden sm:block">
						<AuthButton showThemeToggle />
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
									<Link
										className={buttonVariants({
											variant: 'ghost',
											className: 'justify-start',
										})}
										href="/docs?feature=map"
									>
										Features docs
									</Link>
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
