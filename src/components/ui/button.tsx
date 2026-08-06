import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Cibles tactiles ≥ 44px : les tailles par défaut respectent --tap-target-min.
   Pas de `whitespace-nowrap` : les libellés français sont longs (« Modifier ma
   tournée », « Recalculer les catégories ») et débordaient du cadre sur
   téléphone au lieu de se replier sur deux lignes. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-center rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-jrf-800",
        secondary: "bg-secondary text-secondary-foreground hover:bg-neutral-300",
        outline: "border border-border bg-card hover:bg-secondary",
        ghost: "hover:bg-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        default: "min-h-[44px] px-5 py-2 text-base",
        lg: "min-h-[52px] px-6 py-3 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
