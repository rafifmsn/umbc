import React from "react";
import { Toaster as Sonner } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group font-sans"
      icons={{
        success: <CheckCircle2 className="size-4 text-foreground" />,
        info: <Info className="size-4 text-foreground" />,
        warning: <AlertTriangle className="size-4 text-foreground" />,
        error: <AlertCircle className="size-4 text-foreground" />,
        loading: <Loader2 className="size-4 animate-spin text-foreground" />,
      }}
      {...props}
    />
  );
};
