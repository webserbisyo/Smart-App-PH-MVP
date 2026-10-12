"use client"

import * as React from "react"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "#lib/utils"
import { cssVars } from "#lib/style"

// DiceUI qr-code (P4.0), trimmed: one effect makes a PNG data URL and an SVG string with the `qrcode` package
// (loaded only when a QR is shown); parts read them from context. No canvas part (the image covers it).

type QRCodeLevel = "L" | "M" | "Q" | "H"

interface QRCodeResult {
  dataUrl: string | null
  svg: string | null
  error: Error | null
}

interface QRCodeContextValue extends QRCodeResult {
  size: number
}

const QRCodeContext = React.createContext<QRCodeContextValue | null>(null)

function useQRCode(consumer: string): QRCodeContextValue {
  const context = React.useContext(QRCodeContext)
  if (!context) throw new Error(`${consumer} must be used within QRCode`)
  return context
}

type QRCodeProps = Omit<useRender.ComponentProps<"div">, "onError"> & {
  value: string
  /** Pixels. */
  size?: number
  level?: QRCodeLevel
  margin?: number
  backgroundColor?: string
  foregroundColor?: string
  onError?: (error: Error) => void
}

const EMPTY: QRCodeResult = { dataUrl: null, svg: null, error: null }

function QRCode({
  value,
  size = 200,
  level = "M",
  margin = 1,
  backgroundColor = "#ffffff",
  foregroundColor = "#000000",
  onError,
  className,
  style,
  render,
  ...props
}: QRCodeProps) {
  const [result, setResult] = React.useState<QRCodeResult & { key: string }>({ ...EMPTY, key: "" })
  const onErrorRef = React.useRef(onError)
  React.useEffect(() => {
    onErrorRef.current = onError
  })

  const key = JSON.stringify([value, size, level, margin, backgroundColor, foregroundColor])

  React.useEffect(() => {
    if (!value) return
    let cancelled = false
    const options = {
      errorCorrectionLevel: level,
      margin,
      width: size,
      color: { dark: foregroundColor, light: backgroundColor },
    }
    import("qrcode")
      .then(async ({ toDataURL, toString }) => {
        const [dataUrl, svg] = await Promise.all([toDataURL(value, options), toString(value, { ...options, type: "svg" })])
        if (!cancelled) setResult({ dataUrl, svg, error: null, key })
      })
      .catch((caught: unknown) => {
        const error = caught instanceof Error ? caught : new Error("qr_failed")
        if (!cancelled) setResult({ ...EMPTY, error, key })
        onErrorRef.current?.(error)
      })
    return () => {
      cancelled = true
    }
  }, [key, value, size, level, margin, backgroundColor, foregroundColor])

  // A result for an older value is never shown.
  const current = result.key === key ? result : EMPTY
  const context = React.useMemo<QRCodeContextValue>(
    () => ({ dataUrl: current.dataUrl, svg: current.svg, error: current.error, size }),
    [current.dataUrl, current.svg, current.error, size]
  )

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn("relative flex flex-col items-center gap-2", className),
        style: cssVars({ "--qr-code-size": `${String(size)}px` }, style),
      },
      props
    ),
    render,
    state: { slot: "qr-code" },
  })

  return <QRCodeContext.Provider value={context}>{element}</QRCodeContext.Provider>
}

/** The QR as an image (sharp at any zoom, and long-press saves it on phones). */
function QRCodeImage({ alt, className, ...props }: Omit<React.ComponentProps<"img">, "src"> & { alt: string }) {
  const { dataUrl, size } = useQRCode("QRCodeImage")
  if (!dataUrl) return null
  return (
    <img
      data-slot="qr-code-image"
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={cn("relative aspect-square max-h-(--qr-code-size) w-full max-w-(--qr-code-size)", className)}
      {...props}
    />
  )
}

/** A placeholder in the QR's size until it is ready. */
function QRCodeSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  const { dataUrl, error } = useQRCode("QRCodeSkeleton")
  if (dataUrl || error) return null
  return (
    <div
      data-slot="qr-code-skeleton"
      aria-hidden="true"
      className={cn("aspect-square w-full max-w-(--qr-code-size) animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/** A logo in the middle of the QR (use level "H" so it still scans). */
function QRCodeOverlay({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="qr-code-overlay"
      className={cn(
        "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-background",
        className
      )}
      {...props}
    />
  )
}

type QRCodeDownloadProps = useRender.ComponentProps<"button"> & {
  filename?: string
  format?: "png" | "svg"
}

/** Saves the QR as a PNG (or SVG) file. */
function QRCodeDownload({ filename = "qr-code", format = "png", render, onClick, ...props }: QRCodeDownloadProps) {
  const { dataUrl, svg } = useQRCode("QRCodeDownload")

  const download = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    const link = document.createElement("a")
    let objectUrl: string | null = null
    if (format === "png" && dataUrl) {
      link.href = dataUrl
    } else if (format === "svg" && svg) {
      objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
      link.href = objectUrl
    } else {
      return
    }
    link.download = `${filename}.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">({ type: "button", disabled: !dataUrl, onClick: download }, props),
    render,
    state: { slot: "qr-code-download" },
  })
}

export { QRCode, QRCodeDownload, QRCodeImage, QRCodeOverlay, QRCodeSkeleton, type QRCodeProps }
