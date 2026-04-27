import { useEffect, useRef, useCallback } from 'react'

export function useSuggestionTimer({ intervalSecs, active, onTick }) {
  const timerRef = useRef(null)
  const onTickRef = useRef(onTick)

  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  const trigger = useCallback(() => {
    onTickRef.current()
  }, [])

  useEffect(() => {
    if (!active) {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => onTickRef.current(), intervalSecs * 1000)
    return () => clearInterval(timerRef.current)
  }, [active, intervalSecs])

  return { trigger }
}
