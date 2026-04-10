import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { LogIn, UserPlus, Home, BookOpen, Menu, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

export default async function InfoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If user is logged in, show the full sidebar layout
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('id', user.id)
            .single();

        const role = profile?.role || 'resident';

        const userData = {
            full_name: profile?.full_name || 'User',
            email: user.email!,
            avatar_url: profile?.avatar_url || null,
        };

        return (
            <div className="flex min-h-screen flex-col md:flex-row">
                {/* Desktop Sidebar */}
                <div className="hidden border-r bg-muted/40 md:block md:w-64 lg:w-72">
                    <div className="flex h-full flex-col gap-2">
                        <Sidebar role={role as 'resident' | 'collector' | 'admin'} className="flex-1" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    <Header role={role as 'resident' | 'collector' | 'admin'} user={userData} />
                    <main className="flex-1">
                        {children}
                    </main>
                </div>
            </div>
        );
    }

    // If not logged in, show a simple navigation bar
    const navLinks = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/info', label: 'Waste Guide', icon: BookOpen },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            {/* Simple Navigation Header for non-logged users */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <Leaf className="h-6 w-6 text-primary" />
                        <span className="font-bold text-lg">NHS</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href}>
                                <Button variant="ghost" className="gap-2">
                                    <link.icon className="h-4 w-4" />
                                    {link.label}
                                </Button>
                            </Link>
                        ))}
                    </nav>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-2">
                        <Link href="/auth/login" className="hidden sm:block">
                            <Button variant="ghost" className="gap-2">
                                <LogIn className="h-4 w-4" />
                                Login
                            </Button>
                        </Link>
                        <Link href="/auth/register">
                            <Button className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                <span className="hidden sm:inline">Get Started</span>
                            </Button>
                        </Link>

                        {/* Mobile Menu */}
                        <Sheet>
                            <SheetTrigger asChild className="md:hidden">
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0">
                                <div className="flex flex-col h-full py-4">
                                    <div className="flex items-center px-6 mb-6">
                                        <Leaf className="h-6 w-6 text-primary mr-2" />
                                        <h2 className="text-lg font-semibold">NHS</h2>
                                    </div>
                                    <div className="px-3 space-y-1">
                                        {navLinks.map((link) => (
                                            <Link key={link.href} href={link.href}>
                                                <Button variant="ghost" className="w-full justify-start gap-2">
                                                    <link.icon className="h-4 w-4" />
                                                    {link.label}
                                                </Button>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="mt-auto px-3 space-y-2">
                                        <Link href="/auth/login">
                                            <Button variant="outline" className="w-full gap-2">
                                                <LogIn className="h-4 w-4" />
                                                Login
                                            </Button>
                                        </Link>
                                        <Link href="/auth/register">
                                            <Button className="w-full gap-2">
                                                <UserPlus className="h-4 w-4" />
                                                Get Started
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t bg-muted/30 py-6 mt-auto">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} Neighborhood Sustainability Hub</p>
                </div>
            </footer>
        </div>
    );
}
