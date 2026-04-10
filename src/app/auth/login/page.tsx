'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { login } from '@/app/auth/actions';

const formSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('email', values.email);
            formData.append('password', values.password);

            const result = await login(formData);

            if (result?.error) {
                toast({
                    variant: 'destructive',
                    title: 'Login failed',
                    description: result.error,
                });
            } else {
                toast({
                    title: 'Success',
                    description: 'Logged in successfully',
                });
                // Redirect handled by server action, but fallback here
                // router.push('/resident'); 
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Something went wrong. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                    Enter your credentials to sign in to your account
                </p>
            </div>

            <div className="grid gap-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="name@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                </Form>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {/* Placeholder for social login buttons if needed */}
                    <Button variant="outline" disabled>Github</Button>
                    <Button variant="outline" disabled>Google</Button>
                </div>
            </div>

            <p className="px-8 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                    href="/auth/signup"
                    className="underline underline-offset-4 hover:text-primary"
                >
                    Sign up
                </Link>
            </p>
        </div>
    );
}
