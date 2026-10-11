"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { IconCircleCheck, IconInfoCircle, IconAlertTriangle, IconAlertOctagon, IconLoader } from "@tabler/icons-react"

type Theme = NonNullable<ToasterProps["theme"]>

function subscribeToThemeClass(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => { observer.disconnect(); }
}

function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function getServerThemeSnapshot(): Theme {
  return "light"
}

const Toaster = ({ theme: themeProp, ...props }: ToasterProps) => {
  const documentTheme = React.useSyncExternalStore(
    subscribeToThemeClass,
    getThemeSnapshot,
    getServerThemeSnapshot
  )

  return (
    <Sonner
      theme={themeProp ?? documentTheme}
      className="toaster group"
      icons={{
        success: (
          <IconCircleCheck className="size-4" />
        ),
        info: (
          <IconInfoCircle className="size-4" />
        ),
        warning: (
          <IconAlertTriangle className="size-4" />
        ),
        error: (
          <IconAlertOctagon className="size-4" />
        ),
        loading: (
          <IconLoader className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        }
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { toast } from "sonner"
export { Toaster }
