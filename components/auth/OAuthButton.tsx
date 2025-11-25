"use client";

import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface OAuthButtonProps {
  provider: 'google' | 'github';
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}

export default function OAuthButton({ provider, icon: Icon, onClick, disabled }: OAuthButtonProps) {
  const providerNames = {
    google: 'Google',
    github: 'GitHub',
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-full h-11 font-medium hover:bg-accent transition-all"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="mr-2 h-5 w-5" />
      Continue with {providerNames[provider]}
    </Button>
  );
}
