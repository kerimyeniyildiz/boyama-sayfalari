import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const variantClasses: Record<string, string> = {
  default:
    "bg-brand text-brand-dark hover:bg-brand/90 hover:text-white focus-visible:outline-brand-dark",
  outline:
    "border border-brand-dark/20 text-brand-dark hover:bg-brand-light",
  ghost: "text-brand-dark hover:bg-brand-light/80",
  destructive:
    "bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-600"
};

const sizeClasses: Record<string, string> = {
  default: "h-11 px-5 py-2 text-sm",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10"
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
