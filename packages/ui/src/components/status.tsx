import type * as React from "react"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#lib/utils"

// DiceUI status (P4.0), on our status tokens: one colour per meaning (paper 9.1).
const statusVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors [&>svg]:size-3.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral:
          "border-border bg-muted text-muted-foreground **:data-[slot=status-indicator]:bg-muted-foreground",
        success:
          "border-success/20 bg-success-soft text-success-soft-foreground **:data-[slot=status-indicator]:bg-success",
        warning:
          "border-warning/30 bg-warning-soft text-warning-soft-foreground **:data-[slot=status-indicator]:bg-warning",
        danger:
          "border-destructive/20 bg-destructive-soft text-destructive-soft-foreground **:data-[slot=status-indicator]:bg-destructive",
        info: "border-info/20 bg-info-soft text-info-soft-foreground **:data-[slot=status-indicator]:bg-info",
        member:
          "border-member/20 bg-member-soft text-member-soft-foreground **:data-[slot=status-indicator]:bg-member",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

type StatusProps = VariantProps<typeof statusVariants> & useRender.ComponentProps<"div">

function Status({ className, variant = "neutral", render, ...props }: StatusProps) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ className: cn(statusVariants({ variant }), className) }, props),
    render,
    state: { slot: "status", variant },
  })
}

function StatusIndicator({
  className,
  pulse = false,
  ...props
}: React.ComponentProps<"span"> & {
  /** A soft ping for live things (an open shop, a new order); off under reduced motion. */
  pulse?: boolean
}) {
  return (
    <span
      data-slot="status-indicator"
      aria-hidden="true"
      {...props}
      className={cn(
        "relative flex size-2 shrink-0 rounded-full",
        pulse &&
          "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-inherit motion-reduce:before:animate-none",
        className
      )}
    />
  )
}

function StatusLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="status-label" {...props} className={cn("leading-none", className)} />
}

export { Status, StatusIndicator, StatusLabel, statusVariants }
