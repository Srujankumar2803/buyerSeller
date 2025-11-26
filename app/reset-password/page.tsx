"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import FormError from "@/components/auth/FormError";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("id");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !userId) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token || !userId) {
      setError("Invalid reset link");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <AuthCard
          title="Invalid Link"
          description="This password reset link is invalid"
          footer={
            <div className="text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-primary font-medium hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          }
        >
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">
                Invalid Reset Link
              </p>
              <p className="text-sm text-red-600 dark:text-red-500">
                This link is invalid or incomplete. Please request a new password reset link.
              </p>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <AuthCard
        title="Reset Password"
        description="Enter your new password"
        footer={
          !success && (
            <div className="text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center text-sm text-primary font-medium hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
            </div>
          )
        }
      >
        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                  Password Reset Successful
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Your password has been reset. Redirecting to login...
                </p>
              </div>
            </div>
            
            <Button
              className="w-full rounded-full"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <FormError message={error} />}

            <AuthInput
              label="New Password"
              type="password"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
            />

            <AuthInput
              label="Confirm Password"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />

            <div className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </div>

            <Button
              type="submit"
              className="w-full rounded-full h-11 text-base font-medium shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        )}
      </AuthCard>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
