import { useEffect, useRef, useState } from 'react'

function useTimedFlag(duration = 2000) {
  const [isActive, setIsActive] = useState(false)
  const timeoutRef = useRef(null)

  function trigger() {
    setIsActive(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsActive(false)
      timeoutRef.current = null
    }, duration)
  }

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    },
    [],
  )

  return { isActive, trigger }
}

export default useTimedFlag