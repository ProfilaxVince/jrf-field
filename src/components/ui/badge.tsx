import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Les variantes d'état (warning/critical) utilisent teinte 8 % + texte foncé,
   jamais de fond saturé : les fonds vifs sont réservés aux pastilles de personne. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-sm font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        ok: "border-transparent bg-neutral-100 text-state-ok",
        warning: "border-state-warning/30 bg-state-warning-tint text-state-warning",
        critical: "border-state-critical/30 bg-state-critical-tint text-state-critical",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
