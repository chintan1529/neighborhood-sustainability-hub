"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Recycle, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RecyclerSignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function handleClick() {
    // Grab form values from DOM
    const fullNameInput = document.getElementById("fullName") as HTMLInputElement;
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const passwordInput = document.getElementById("password") as HTMLInputElement;

    if (!fullNameInput?.value || !emailInput?.value || !passwordInput?.value) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (passwordInput.value.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set("fullName", fullNameInput.value);
      formData.set("email", emailInput.value);
      formData.set("password", passwordInput.value);
      formData.set("role", "recycler");

      const result = await signup(formData);

      if (result?.error) {
        setErrorMsg(result.error);
        toast({
          title: "Registration Failed",
          description: result.error,
          variant: "destructive",
        });
        setIsLoading(false);
      } else if (result?.success && result?.redirectUrl) {
        toast({
          title: "Account Created!",
          description: "Redirecting to your dashboard...",
        });
        router.push(result.redirectUrl);
      } else {
        // Fallback
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setErrorMsg("Something went wrong. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-background to-green-50 dark:from-teal-950/20 dark:via-background dark:to-green-950/20 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
            <Recycle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Join as Recycler
          </h1>
          <p className="text-muted-foreground mt-2">
            Create your account to start buying recyclable waste
          </p>
        </div>

        <Card className="shadow-2xl border-teal-100 dark:border-teal-900/50">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              You&apos;ll complete your business profile after signing up
            </CardDescription>
          </CardHeader>
          {/* No <form> element at all — prevents native submission entirely */}
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your full name"
                className="focus-visible:ring-teal-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="recycler@example.com"
                className="focus-visible:ring-teal-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                className="focus-visible:ring-teal-500"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
              </div>
            )}

            <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                What happens next?
              </p>
              <ul className="text-sm text-teal-700 dark:text-teal-400 space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />{" "}
                  Set up your business profile
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />{" "}
                  Submit for verification
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />{" "}
                  Start bidding on recyclable waste
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="button"
              disabled={isLoading}
              onClick={handleClick}
              className="w-full bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating
                  account...
                </>
              ) : (
                "Create Recycler Account"
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                href="/auth/login/recycler"
                className="text-teal-600 font-semibold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/auth/signup"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to role selection
          </Link>
        </div>
      </div>
    </div>
  );
}
