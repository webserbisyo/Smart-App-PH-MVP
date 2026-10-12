"use client"

import * as React from "react"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { useMergedRefs } from "@base-ui/utils/useMergedRefs"
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from "@tabler/icons-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#lib/utils"

// DiceUI scroller (P4.0), trimmed: edge fades while there is more to scroll, and optional arrow buttons that
// scroll by most of a page on click (no press-and-hold or hover scrolling). Tabler icons.

const scrollerVariants = cva("", {
  variants: {
    orientation: {
      vertical: [
        "overflow-y-auto overscroll-contain",
        "data-scroll-start:mask-[linear-gradient(0deg,#000_calc(100%-var(--scroll-shadow-size)),transparent)]",
        "data-scroll-end:mask-[linear-gradient(180deg,#000_calc(100%-var(--scroll-shadow-size)),transparent)]",
        "data-scroll-start:data-scroll-end:mask-[linear-gradient(#000,#000,transparent_0,#000_var(--scroll-shadow-size),#000_calc(100%-var(--scroll-shadow-size)),transparent)]",
      ],
      horizontal: [
        "overflow-x-auto overscroll-x-contain",
        "data-scroll-start:mask-[linear-gradient(270deg,#000_calc(100%-var(--scroll-shadow-size)),transparent)]",
        "data-scroll-end:mask-[linear-gradient(90deg,#000_calc(100%-var(--scroll-shadow-size)),transparent)]",
        "data-scroll-start:data-scroll-end:mask-[linear-gradient(to_right,#000,#000,transparent_0,#000_var(--scroll-shadow-size),#000_calc(100%-var(--scroll-shadow-size)),transparent)]",
      ],
    },
    hideScrollbar: {
      true: "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      false: "",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    hideScrollbar: false,
  },
})

interface Edges {
  start: boolean
  end: boolean
}

type ScrollerProps = VariantProps<typeof scrollerVariants> &
  useRender.ComponentProps<"div"> & {
    /** Fade size in px. */
    size?: number
    /** Arrow buttons at the edges (desktop); phones swipe. */
    withNavigation?: boolean
    /** Accessible names for the arrow buttons. */
    previousLabel?: string
    nextLabel?: string
  }

function readEdges(element: HTMLElement, vertical: boolean): Edges {
  const position = vertical ? element.scrollTop : element.scrollLeft
  const visible = vertical ? element.clientHeight : element.clientWidth
  const total = vertical ? element.scrollHeight : element.scrollWidth
  return { start: position > 1, end: position + visible < total - 1 }
}

function Scroller({
  orientation = "vertical",
  hideScrollbar,
  className,
  size = 32,
  style,
  render,
  withNavigation = false,
  previousLabel = "Scroll back",
  nextLabel = "Scroll forward",
  ref,
  children,
  ...props
}: ScrollerProps) {
  const vertical = orientation === "vertical"
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const composedRef = useMergedRefs(ref, containerRef)
  const [edges, setEdges] = React.useState<Edges>({ start: false, end: false })

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const update = () => {
      const next = readEdges(container, vertical)
      // Attributes, not state, drive the fades, so scrolling never re-renders the content.
      container.toggleAttribute("data-scroll-start", next.start)
      container.toggleAttribute("data-scroll-end", next.end)
      setEdges((previous) => (previous.start === next.start && previous.end === next.end ? previous : next))
    }
    // The observer also fires once right away, which sets the first state.
    const observer = new ResizeObserver(update)
    observer.observe(container)
    container.addEventListener("scroll", update, { passive: true })
    return () => {
      observer.disconnect()
      container.removeEventListener("scroll", update)
    }
  }, [vertical])

  const scrollByPage = (direction: 1 | -1) => {
    const container = containerRef.current
    if (!container) return
    const page = (vertical ? container.clientHeight : container.clientWidth) * 0.8 * direction
    container.scrollBy(vertical ? { top: page, behavior: "smooth" } : { left: page, behavior: "smooth" })
  }

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        ref: composedRef,
        style: { "--scroll-shadow-size": `${String(size)}px`, ...style },
        className: cn(scrollerVariants({ orientation, hideScrollbar }), className),
        children,
      },
      props
    ),
    render,
    state: { slot: "scroller" },
  })

  if (!withNavigation) return element

  const PreviousIcon = vertical ? IconChevronUp : IconChevronLeft
  const NextIcon = vertical ? IconChevronDown : IconChevronRight
  const buttonClass =
    "absolute z-10 hidden size-8 items-center justify-center rounded-full border bg-background text-foreground shadow-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring pointer-fine:flex [&>svg]:size-4"

  return (
    <div className="relative w-full min-w-0">
      {edges.start && (
        <button
          type="button"
          aria-label={previousLabel}
          onClick={() => {
            scrollByPage(-1)
          }}
          className={cn(buttonClass, vertical ? "top-1 left-1/2 -translate-x-1/2" : "top-1/2 left-1 -translate-y-1/2")}
        >
          <PreviousIcon aria-hidden="true" />
        </button>
      )}
      {element}
      {edges.end && (
        <button
          type="button"
          aria-label={nextLabel}
          onClick={() => {
            scrollByPage(1)
          }}
          className={cn(buttonClass, vertical ? "bottom-1 left-1/2 -translate-x-1/2" : "top-1/2 right-1 -translate-y-1/2")}
        >
          <NextIcon aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export { Scroller }
