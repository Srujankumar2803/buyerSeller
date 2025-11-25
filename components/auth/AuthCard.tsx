import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md rounded-2xl shadow-xl border-border/50">
      <CardHeader className="space-y-2 p-6 sm:p-8">
        <CardTitle className="text-2xl sm:text-3xl font-bold text-center">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-center text-base">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-6 sm:p-8 pt-0">
        {children}
        {footer && (
          <div className="mt-6 pt-6 border-t border-border">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
