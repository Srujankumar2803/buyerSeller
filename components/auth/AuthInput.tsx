import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export default function AuthInput({ label, error, helperText, id, ...props }: AuthInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-2">
      <Label 
        htmlFor={inputId} 
        className="text-sm font-medium text-foreground"
      >
        {label}
      </Label>
      <Input
        id={inputId}
        className={`rounded-xl h-11 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive font-medium">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
