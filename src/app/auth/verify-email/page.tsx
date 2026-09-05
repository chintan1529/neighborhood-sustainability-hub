"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { verifyEmailOtp, resendOtp } from "@/app/actions/verify-email";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full flex-col items-center justify-center space-y-6 sm:w-[420px]">
          <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center animate-pulse">
            <Mail className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-muted-foreground">Loading verification...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Backspace: clear current and move to previous
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || "";
      }
      setOtp(newOtp);
      // Focus the next empty input or the last one
      const nextEmpty = newOtp.findIndex((v) => !v);
      inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const token = otp.join("");
    if (token.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter the complete 6-digit code.",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyEmailOtp({ email, token });

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: result.error,
        });
        // Clear OTP on failure
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else if (result.success && result.redirectUrl) {
        toast({
          title: "Email Verified! ✓",
          description: "Your account is now active. Redirecting...",
        });
        window.location.href = result.redirectUrl;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  }, [otp, email, toast]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (otp.every((digit) => digit !== "") && !isVerifying) {
      handleVerify();
    }
  }, [otp, isVerifying, handleVerify]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      const result = await resendOtp(email);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Resend Failed",
          description: result.error,
        });
      } else {
        toast({
          title: "Code Resent",
          description: "A new verification code has been sent to your email.",
        });
        setResendCooldown(60); // 60 second cooldown
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend code. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Masked email for display
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c)
    : "";

  return (
    <div className="mx-auto flex w-full flex-col items-center justify-center space-y-6 sm:w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Mail className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Verify Your Email
        </h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a 6-digit verification code to
        </p>
        <p className="text-sm font-semibold text-foreground">{maskedEmail}</p>
      </div>

      {/* OTP Card */}
      <Card className="w-full shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Enter Verification Code</CardTitle>
          <CardDescription>
            Check your email inbox and spam folder
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OTP Input Grid */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-xl font-bold border-2 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-200"
                disabled={isVerifying}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
            disabled={isVerifying || otp.some((d) => !d)}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>

          {/* Resend */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Didn&apos;t receive the code?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Resend Code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Back Link */}
      <Link
        href="/auth/signup"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to sign up
      </Link>
    </div>
  );
}
