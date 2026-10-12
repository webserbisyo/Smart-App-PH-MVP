"use client"

import * as React from "react"

import { cn } from "#lib/utils"
import { useIsMobile } from "#hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#components/drawer"

// DiceUI responsive-dialog (P4.0), reworked: one API that is a swipe-down bottom sheet on phones and, on wider
// screens, a centred dialog or a drawer on the right (`desktop="right"`, the storefront cart). The DiceUI store
// was replaced by plain context, since its render-time ref writes break the React compiler rules.

type Shape = "sheet" | "dialog" | "right"

const ShapeContext = React.createContext<Shape | null>(null)

function useShape(consumer: string): Shape {
  const shape = React.useContext(ShapeContext)
  if (!shape) throw new Error(`${consumer} must be used within ResponsiveDialog`)
  return shape
}

interface ResponsiveDialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** What wider screens get: a centred dialog (default) or a drawer from the right. */
  desktop?: "dialog" | "right"
  children?: React.ReactNode
}

function ResponsiveDialog({ open, defaultOpen, onOpenChange, desktop = "dialog", children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const shape: Shape = isMobile ? "sheet" : desktop
  const rootProps = {
    ...(open === undefined ? {} : { open }),
    ...(defaultOpen === undefined ? {} : { defaultOpen }),
    ...(onOpenChange === undefined
      ? {}
      : {
          onOpenChange: (next: boolean) => {
            onOpenChange(next)
          },
        }),
  }

  return (
    <ShapeContext.Provider value={shape}>
      {shape === "dialog" ? (
        <Dialog {...rootProps}>{children}</Dialog>
      ) : (
        <Drawer {...rootProps} swipeDirection={shape === "sheet" ? "down" : "right"} showSwipeHandle={shape === "sheet"}>
          {children}
        </Drawer>
      )}
    </ShapeContext.Provider>
  )
}

function ResponsiveDialogTrigger(props: Omit<React.ComponentProps<typeof DialogTrigger>, "handle" | "payload">) {
  const shape = useShape("ResponsiveDialogTrigger")
  return shape === "dialog" ? <DialogTrigger {...props} /> : <DrawerTrigger {...props} />
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  const shape = useShape("ResponsiveDialogClose")
  return shape === "dialog" ? <DialogClose {...props} /> : <DrawerClose {...props} />
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton,
}: {
  className?: string
  children?: React.ReactNode
  /** Dialog only: the corner close button (sheets close by swiping down or tapping outside). */
  showCloseButton?: boolean
}) {
  const shape = useShape("ResponsiveDialogContent")
  if (shape === "dialog") {
    return (
      <DialogContent {...(showCloseButton === undefined ? {} : { showCloseButton })} className={className}>
        {children}
      </DialogContent>
    )
  }
  return (
    <DrawerContent className={cn(shape === "sheet" && "pb-safe", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </DrawerContent>
  )
}

function ResponsiveDialogHeader(props: React.ComponentProps<"div">) {
  const shape = useShape("ResponsiveDialogHeader")
  return shape === "dialog" ? <DialogHeader {...props} /> : <DrawerHeader {...props} />
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const shape = useShape("ResponsiveDialogFooter")
  return shape === "dialog" ? (
    <DialogFooter className={className} {...props} />
  ) : (
    <DrawerFooter className={cn("mt-auto", className)} {...props} />
  )
}

function ResponsiveDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  const shape = useShape("ResponsiveDialogTitle")
  return shape === "dialog" ? <DialogTitle {...props} /> : <DrawerTitle {...props} />
}

function ResponsiveDialogDescription(props: React.ComponentProps<typeof DialogDescription>) {
  const shape = useShape("ResponsiveDialogDescription")
  return shape === "dialog" ? <DialogDescription {...props} /> : <DrawerDescription {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
}
