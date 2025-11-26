"use client";

import { useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import FormError from "@/components/auth/FormError";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setResetLink("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccess(true);
      // In development, show the reset link
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <AuthCard
        title="Forgot Password"
        description="Enter your email to receive a password reset link"
        footer={
          <div className="text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center text-sm text-primary font-medium hover:underline"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        }
      >
        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                  Check your email
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  If an account exists for {email}, you will receive a password reset link shortly.
                </p>
              </div>
            </div>

            {resetLink && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium mb-2">
                  Development Mode - Reset Link:
                </p>
                <a 
                  href={resetLink}
                  className="text-sm text-primary hover:underline break-all"
                >
                  {resetLink}
                </a>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                setSuccess(false);
                setEmail("");
                setResetLink("");
              }}
            >
              Send Another Link
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <FormError message={error} />}

            <div className="bg-muted/50 border rounded-xl p-4 text-sm text-muted-foreground">
              <p>
                Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <AuthInput
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoFocus
            />

            <Button
              type="submit"
              className="w-full rounded-full h-11 text-base font-medium shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        )}
      </AuthCard>
    </div>
  );
}
