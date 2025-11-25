import { AlertCircle } from "lucide-react";

interface FormErrorProps {
  message?: string;
}

export default function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <p className="text-sm text-destructive font-medium">
        {message}
      </p>
    </div>
  );
}
