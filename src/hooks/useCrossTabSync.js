import { useEffect, useRef } from 'react'

const CHANNEL_NAME = 'jeopardy_game'

/**
 * Hook to sync state across multiple browser tabs using BroadcastChannel API
 * @param {string} messageType - Type of message to broadcast/listen for
 * @param {*} value - Current value to broadcast when changed
 * @param {function} onMessageReceived - Callback when message received from other tab
 */
export function useCrossTabSync(messageType, value, onMessageReceived) {
  const channelRef = useRef(null)

  // Initialize channel
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) {
      return
    }

    channelRef.current = new BroadcastChannel(CHANNEL_NAME)

    const handleMessage = (event) => {
      if (event.data.type === messageType && onMessageReceived) {
        onMessageReceived(event.data.value)
      }
    }

    channelRef.current.addEventListener('message', handleMessage)

    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage)
        channelRef.current.close()
      }
    }
  }, [messageType, onMessageReceived])

  // Broadcast value changes
  useEffect(() => {
    if (channelRef.current && value !== undefined) {
      channelRef.current.postMessage({
        type: messageType,
        value,
      })
    }
  }, [messageType, value])

  return channelRef.current
}

export default useCrossTabSync
