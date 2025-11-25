"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Welcome, {session.user?.name}!</h1>
        <p className="text-muted-foreground mb-8">
          Role: <span className="font-medium capitalize">{session.user?.role?.toLowerCase()}</span>
        </p>

        <div className="grid gap-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="font-medium">{session.user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">User ID</dt>
                <dd className="font-mono text-sm">{session.user?.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd className="font-medium">{session.user?.role}</dd>
              </div>
            </dl>
          </div>

          {session.user?.role === "SELLER" && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-2">Seller Dashboard</h2>
              <p className="text-muted-foreground mb-4">
                You can create and manage your listings here.
              </p>
              {/* Add seller-specific features */}
            </div>
          )}

          {session.user?.role === "BUYER" && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Buyer Dashboard</h2>
              <p className="text-muted-foreground mb-4">
                Browse and purchase items from sellers.
              </p>
              {/* Add buyer-specific features */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
