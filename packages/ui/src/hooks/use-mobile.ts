import * as React from "react"

export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${String(breakpoint - 1)}px)`
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => {
        mql.removeEventListener("change", onChange)
      }
    },
    [query]
  )
  const getSnapshot = React.useCallback(() => window.innerWidth < breakpoint, [breakpoint])
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
