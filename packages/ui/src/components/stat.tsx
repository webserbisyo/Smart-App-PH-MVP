import type * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#lib/utils"

// DiceUI stat (P4.0), trimmed: no trend part (Home has no "% vs last week", UX-8), status tokens for colours.
function Stat({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat"
      className={cn(
        "grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-xl border bg-card p-4 text-card-foreground",
        "**:data-[slot=stat-label]:col-span-1 **:data-[slot=stat-value]:col-span-1",
        "**:data-[slot=stat-indicator]:col-start-2 **:data-[slot=stat-indicator]:row-span-2 **:data-[slot=stat-indicator]:row-start-1 **:data-[slot=stat-indicator]:self-start",
        "**:data-[slot=stat-description]:col-span-2",
        className
      )}
      {...props}
    />
  )
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="stat-label" className={cn("text-sm font-medium text-muted-foreground", className)} {...props} />
  )
}

const statIndicatorVariants = cva(
  "flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      color: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-success-soft text-success-soft-foreground",
        info: "bg-info-soft text-info-soft-foreground",
        warning: "bg-warning-soft text-warning-soft-foreground",
        danger: "bg-destructive-soft text-destructive-soft-foreground",
        member: "bg-member-soft text-member-soft-foreground",
      },
    },
    defaultVariants: {
      color: "neutral",
    },
  }
)

type StatIndicatorProps = Omit<React.ComponentProps<"div">, "color"> & VariantProps<typeof statIndicatorVariants>

function StatIndicator({ className, color = "neutral", ...props }: StatIndicatorProps) {
  return (
    <div
      data-slot="stat-indicator"
      data-color={color}
      aria-hidden="true"
      className={cn(statIndicatorVariants({ color }), className)}
      {...props}
    />
  )
}

function StatValue({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="stat-value" className={cn("tabular text-2xl font-bold tracking-tight", className)} {...props} />
  )
}

function StatDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="stat-description" className={cn("text-xs text-muted-foreground", className)} {...props} />
}

export { Stat, StatDescription, StatIndicator, StatLabel, StatValue }
