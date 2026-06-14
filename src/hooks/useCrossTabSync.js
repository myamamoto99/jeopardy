import { useEffect, useRef } from 'react'

const CHANNEL_NAME = 'jeopardy_game'
const STORAGE_KEY_PREFIX = 'jeopardy.sync.'

/**
 * Hook to sync state across multiple browser tabs using BroadcastChannel API
 * @param {string} messageType - Type of message to broadcast/listen for
 * @param {*} value - Current value to broadcast when changed
 * @param {function} onMessageReceived - Callback when message received from other tab
 */
export function useCrossTabSync(messageType, value, onMessageReceived) {
  const channelRef = useRef(null)
  const handlerRef = useRef(onMessageReceived)
  const initializedRef = useRef(false)
  const senderIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random()}`,
  )

  useEffect(() => {
    handlerRef.current = onMessageReceived
  }, [onMessageReceived])

  // Initialize channel
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${messageType}`

    try {
      const existing = window.localStorage.getItem(storageKey)
      if (existing) {
        const payload = JSON.parse(existing)
        if (payload?.senderId !== senderIdRef.current && handlerRef.current) {
          handlerRef.current(payload.value)
        }
      }
    } catch {
      // Ignore malformed persisted sync payload.
    }

    if (window.BroadcastChannel) {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME)
    }

    const handlePayload = (payload) => {
      if (
        payload?.type === messageType &&
        payload.senderId !== senderIdRef.current &&
        handlerRef.current
      ) {
        handlerRef.current(payload.value)
      }
    }

    const handleMessage = (event) => {
      handlePayload(event.data)
    }

    const handleStorage = (event) => {
      if (event.key !== storageKey || !event.newValue) {
        return
      }

      try {
        handlePayload(JSON.parse(event.newValue))
      } catch {
        // Ignore malformed storage events.
      }
    }

    channelRef.current?.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)

      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage)
        channelRef.current.close()
        channelRef.current = null
      }
    }
  }, [messageType])

  // Broadcast value changes
  useEffect(() => {
    if (typeof window === 'undefined' || value === undefined) {
      return
    }

    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }

    const payload = {
      type: messageType,
      value,
      senderId: senderIdRef.current,
    }

    try {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${messageType}`, JSON.stringify(payload))
    } catch {
      // Ignore storage write errors.
    }

    channelRef.current?.postMessage(payload)
  }, [messageType, value])

  return channelRef.current
}

export default useCrossTabSync
