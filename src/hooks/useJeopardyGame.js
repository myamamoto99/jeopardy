import { useEffect, useMemo, useRef, useState } from 'react'
import { cloneDefaultCategories } from '../data/gameData'
import { sanitizePlainText } from '../utils/inputSecurity'
import useTimedFlag from './useTimedFlag'
import { sanitizeYouTubeUrl } from '../utils/youtube'
import { useCrossTabSync } from './useCrossTabSync'

const CATEGORIES_STORAGE_KEY = 'jeopardy.categories.v1'
const ROOM_CODE_STORAGE_KEY = 'jeopardy.roomCode.v1'
const FIREBASE_DB_URL = (process.env.NEXT_PUBLIC_FIREBASE_DB_URL || '').replace(/\/$/, '')
const DEFAULT_CATEGORIES = cloneDefaultCategories()
const CATEGORY_COUNT = DEFAULT_CATEGORIES.length
const CLUE_COUNT = DEFAULT_CATEGORIES[0]?.clues?.length || 5

function sanitizeRoomCode(value) {
  if (typeof value !== 'string') return ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

function createRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function loadInitialRoomCode() {
  if (typeof window === 'undefined') {
    return createRoomCode()
  }

  try {
    const roomFromUrl = sanitizeRoomCode(
      new URLSearchParams(window.location.search).get('room') || '',
    )
    if (roomFromUrl) {
      return roomFromUrl
    }

    const saved = sanitizeRoomCode(window.localStorage.getItem(ROOM_CODE_STORAGE_KEY) || '')
    if (saved) {
      return saved
    }
  } catch {
    // Fall through to generated room code.
  }

  return createRoomCode()
}

function normalizeBuzzers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  return Object.entries(raw).reduce((acc, [id, value]) => {
    if (!value || typeof value !== 'object') {
      return acc
    }

    acc[id] = {
      teamIndex: Number.isFinite(value.teamIndex) ? value.teamIndex : 0,
      buzzedIn: value.buzzedIn === true,
      buzzTime: typeof value.buzzTime === 'number' ? value.buzzTime : null,
    }
    return acc
  }, {})
}

function normalizeCategoriesForStorage(categories) {
  return categories.map((cat) => ({
    name: sanitizePlainText(cat.name, 60),
    clues: cat.clues.map((clue) => ({
      answer: sanitizePlainText(clue.answer, 240),
      question: sanitizePlainText(clue.question, 240),
      mediaUrl: sanitizeYouTubeUrl(clue.mediaUrl || ''),
      used: clue.used,
    })),
  }))
}

function buildCategoriesFromStoredValue(storedValue) {
  const defaults = cloneDefaultCategories()

  if (!Array.isArray(storedValue) || storedValue.length !== defaults.length) {
    return defaults
  }

  return defaults.map((defaultCat, catIdx) => {
    const savedCat = storedValue[catIdx]
    if (!savedCat || !Array.isArray(savedCat.clues)) {
      return defaultCat
    }

    return {
      ...defaultCat,
      name:
        typeof savedCat.name === 'string'
          ? sanitizePlainText(savedCat.name, 60)
          : defaultCat.name,
      clues: defaultCat.clues.map((defaultClue, clueIdx) => {
        const savedClue = savedCat.clues[clueIdx]
        if (!savedClue) {
          return defaultClue
        }

        return {
          ...defaultClue,
          answer:
            typeof savedClue.answer === 'string'
              ? sanitizePlainText(savedClue.answer, 240)
              : defaultClue.answer,
          question:
            typeof savedClue.question === 'string'
              ? sanitizePlainText(savedClue.question, 240)
              : defaultClue.question,
          mediaUrl:
            typeof savedClue.mediaUrl === 'string'
              ? sanitizeYouTubeUrl(savedClue.mediaUrl)
              : '',
          used: savedClue.used === true,
        }
      }),
    }
  })
}

function loadInitialCategories() {
  if (typeof window === 'undefined') {
    return cloneDefaultCategories()
  }

  try {
    const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY)
    if (!raw) {
      return cloneDefaultCategories()
    }

    const parsed = JSON.parse(raw)
    return buildCategoriesFromStoredValue(parsed)
  } catch {
    return cloneDefaultCategories()
  }
}

function normalizeScores(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  return Object.entries(raw).reduce((acc, [name, value]) => {
    const safeName = sanitizePlainText(name, 60)
    if (!safeName) {
      return acc
    }

    const numericScore = Number(value)
    acc[safeName] = Number.isFinite(numericScore) ? numericScore : 0
    return acc
  }, {})
}

function normalizePlayers(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return ['Team 1', 'Team 2', 'Team 3']
  }

  return raw.map((name, idx) => {
    const safeName = sanitizePlainText(typeof name === 'string' ? name : '', 60).trim()
    return safeName || `Team ${idx + 1}`
  })
}

function normalizeSelection(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const ci = Number(raw.ci)
  const vi = Number(raw.vi)
  if (!Number.isInteger(ci) || !Number.isInteger(vi)) {
    return null
  }

  if (ci < 0 || ci >= CATEGORY_COUNT || vi < 0 || vi >= CLUE_COUNT) {
    return null
  }

  return { ci, vi }
}

function normalizeRemoteGameState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  return {
    categories: buildCategoriesFromStoredValue(raw.categories),
    scores: normalizeScores(raw.scores),
    players: normalizePlayers(raw.players),
    activeClue: normalizeSelection(raw.activeClue),
    hostClueState: raw.hostClueState === 'revealed' ? 'revealed' : 'hidden',
    hostSelection: normalizeSelection(raw.hostSelection),
    homeBoardReveal: raw.homeBoardReveal === true,
    boardReady: raw.boardReady === true,
  }
}

function useJeopardyGame() {
  const isRemoteSyncEnabled = Boolean(FIREBASE_DB_URL)
  const applyingRemoteGameRef = useRef(false)
  const lastSyncedGameStateRef = useRef('')

  const [view, setView] = useState('home')
  const [roomCode, setRoomCode] = useState('')
  const [categories, setCategories] = useState(loadInitialCategories)
  const [scores, setScores] = useState({})
  const [players, setPlayers] = useState(['Team 1', 'Team 2', 'Team 3'])
  const [activeClue, setActiveClue] = useState(null)
  const [hostClueState, setHostClueState] = useState('hidden')
  const [editingCat, setEditingCat] = useState(0)
  const [hostSelection, setHostSelection] = useState(null)
  const [homeBoardReveal, setHomeBoardReveal] = useState(false)
  const [boardReady, setBoardReady] = useState(false)

  const [connectedPlayerId, setConnectedPlayerId] = useState(null)
  const [buzzers, setBuzzers] = useState({})
  const [firebaseStatus, setFirebaseStatus] = useState({
    envConfigured: isRemoteSyncEnabled,
    gameStream: isRemoteSyncEnabled ? 'connecting' : 'disabled',
    buzzerStream: isRemoteSyncEnabled ? 'connecting' : 'disabled',
    lastWrite: 'idle',
    lastError: '',
    lastWriteAt: null,
  })

  const editorSavedFlag = useTimedFlag(2000)
  const playersSavedFlag = useTimedFlag(2000)

  const activePlayers = useMemo(
    () => players.map((name, idx) => name || `Team ${idx + 1}`),
    [players],
  )

  const remoteGameState = useMemo(
    () => ({
      categories: normalizeCategoriesForStorage(categories),
      scores,
      players,
      activeClue,
      hostClueState,
      hostSelection,
      homeBoardReveal,
      boardReady,
    }),
    [
      categories,
      scores,
      players,
      activeClue,
      hostClueState,
      hostSelection,
      homeBoardReveal,
      boardReady,
    ],
  )

  useCrossTabSync('categories', categories, (newCategories) => {
    setCategories(newCategories)
  })

  useCrossTabSync('scores', scores, (newScores) => {
    setScores(newScores)
  })

  useCrossTabSync('players', players, (newPlayers) => {
    setPlayers(newPlayers)
  })

  useCrossTabSync('activeClue', activeClue, (newActiveClue) => {
    setActiveClue(newActiveClue)
  })

  useCrossTabSync('hostClueState', hostClueState, (newHostClueState) => {
    setHostClueState(newHostClueState)
  })

  useCrossTabSync('hostSelection', hostSelection, (newHostSelection) => {
    setHostSelection(newHostSelection)
  })

  useCrossTabSync('homeBoardReveal', homeBoardReveal, (newHomeBoardReveal) => {
    setHomeBoardReveal(newHomeBoardReveal)
  })

  useCrossTabSync('boardReady', boardReady, (newBoardReady) => {
    setBoardReady(newBoardReady)
  })

  useCrossTabSync('buzzers', buzzers, (newBuzzers) => {
    setBuzzers(newBuzzers)
  })

  useEffect(() => {
    if (roomCode || typeof window === 'undefined') {
      return
    }

    setRoomCode(loadInitialRoomCode())
  }, [roomCode])

  useEffect(() => {
    if (typeof window === 'undefined' || !roomCode) {
      return
    }

    window.localStorage.setItem(ROOM_CODE_STORAGE_KEY, roomCode)
  }, [roomCode])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const serializable = normalizeCategoriesForStorage(categories)
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(serializable))
  }, [categories])

  useEffect(() => {
    if (typeof window === 'undefined' || !isRemoteSyncEnabled || !roomCode) {
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: isRemoteSyncEnabled ? 'idle' : 'disabled',
      }))
      return
    }

    const streamUrl = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(roomCode)}/gameState.json`
    const source = new EventSource(streamUrl)
    source.onopen = () => {
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: 'connected',
        lastError: prev.gameStream === 'connected' ? prev.lastError : '',
      }))
    }
    source.onerror = () => {
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: 'error',
        lastError: 'Game stream disconnected',
      }))
    }

    const applyEventData = (eventData) => {
      try {
        const payload = JSON.parse(eventData)
        if (payload?.path !== '/') {
          return
        }

        const normalized = normalizeRemoteGameState(payload.data)
        if (!normalized) {
          return
        }

        applyingRemoteGameRef.current = true
        lastSyncedGameStateRef.current = JSON.stringify({
          categories: normalizeCategoriesForStorage(normalized.categories),
          scores: normalized.scores,
          players: normalized.players,
          activeClue: normalized.activeClue,
          hostClueState: normalized.hostClueState,
          hostSelection: normalized.hostSelection,
          homeBoardReveal: normalized.homeBoardReveal,
          boardReady: normalized.boardReady,
        })

        setCategories(normalized.categories)
        setScores(normalized.scores)
        setPlayers(normalized.players)
        setActiveClue(normalized.activeClue)
        setHostClueState(normalized.hostClueState)
        setHostSelection(normalized.hostSelection)
        setHomeBoardReveal(normalized.homeBoardReveal)
        setBoardReady(normalized.boardReady)
      } catch {
        // Ignore malformed stream event payloads.
      } finally {
        applyingRemoteGameRef.current = false
      }
    }

    const handlePut = (event) => applyEventData(event.data)

    source.addEventListener('put', handlePut)

    return () => {
      source.removeEventListener('put', handlePut)
      source.close()
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: isRemoteSyncEnabled ? 'idle' : 'disabled',
      }))
    }
  }, [isRemoteSyncEnabled, roomCode])

  useEffect(() => {
    if (!isRemoteSyncEnabled || !roomCode) {
      return
    }

    const serialized = JSON.stringify(remoteGameState)

    if (applyingRemoteGameRef.current) {
      lastSyncedGameStateRef.current = serialized
      return
    }

    if (lastSyncedGameStateRef.current === serialized) {
      return
    }

    lastSyncedGameStateRef.current = serialized

    const writeUrl = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(roomCode)}/gameState.json`
    fetch(writeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`gameState write failed (${response.status})`)
        }

        setFirebaseStatus((prev) => ({
          ...prev,
          lastWrite: 'ok',
          lastError: '',
          lastWriteAt: Date.now(),
        }))
      })
      .catch((error) => {
        setFirebaseStatus((prev) => ({
          ...prev,
          lastWrite: 'error',
          lastError: error?.message || 'gameState write failed',
        }))
      })
  }, [isRemoteSyncEnabled, roomCode, remoteGameState])

  useEffect(() => {
    if (typeof window === 'undefined' || !isRemoteSyncEnabled || !roomCode) {
      setFirebaseStatus((prev) => ({
        ...prev,
        buzzerStream: isRemoteSyncEnabled ? 'idle' : 'disabled',
      }))
      return
    }

    const streamUrl = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(roomCode)}/buzzers.json`
    const source = new EventSource(streamUrl)
    source.onopen = () => {
      setFirebaseStatus((prev) => ({
        ...prev,
        buzzerStream: 'connected',
        lastError: prev.buzzerStream === 'connected' ? prev.lastError : '',
      }))
    }
    source.onerror = () => {
      setFirebaseStatus((prev) => ({
        ...prev,
        buzzerStream: 'error',
        lastError: 'Buzzer stream disconnected',
      }))
    }

    const applyEventData = (eventData) => {
      try {
        const payload = JSON.parse(eventData)
        const path = payload?.path

        if (path === '/') {
          setBuzzers(normalizeBuzzers(payload.data))
          return
        }

        if (!path || !path.startsWith('/')) {
          return
        }

        const buzzerId = path.slice(1)
        setBuzzers((prev) => {
          const next = { ...prev }
          if (payload.data === null) {
            delete next[buzzerId]
          } else {
            const normalized = normalizeBuzzers({ [buzzerId]: payload.data })
            if (normalized[buzzerId]) {
              next[buzzerId] = normalized[buzzerId]
            }
          }
          return next
        })
      } catch {
        // Ignore malformed stream event payloads.
      }
    }

    const handlePut = (event) => applyEventData(event.data)
    const handlePatch = (event) => applyEventData(event.data)

    source.addEventListener('put', handlePut)
    source.addEventListener('patch', handlePatch)

    return () => {
      source.removeEventListener('put', handlePut)
      source.removeEventListener('patch', handlePatch)
      source.close()
      setFirebaseStatus((prev) => ({
        ...prev,
        buzzerStream: isRemoteSyncEnabled ? 'idle' : 'disabled',
      }))
    }
  }, [isRemoteSyncEnabled, roomCode])

  function writeRemoteBuzzers(nextBuzzers) {
    if (!isRemoteSyncEnabled || !roomCode) {
      return
    }

    const writeUrl = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(roomCode)}/buzzers.json`
    fetch(writeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextBuzzers),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`buzzers write failed (${response.status})`)
        }

        setFirebaseStatus((prev) => ({
          ...prev,
          lastWrite: 'ok',
          lastError: '',
          lastWriteAt: Date.now(),
        }))
      })
      .catch((error) => {
        setFirebaseStatus((prev) => ({
          ...prev,
          lastWrite: 'error',
          lastError: error?.message || 'buzzers write failed',
        }))
      })
  }

  function showClue(ci, vi) {
    const clue = categories[ci].clues[vi]
    if (clue.used) return
    setActiveClue({ ci, vi })
    setHostClueState('hidden')
    setHomeBoardReveal(false)
  }

  function markClueUsed(ci, vi, used) {
    setCategories((prev) =>
      prev.map((cat, catIdx) => ({
        ...cat,
        clues: cat.clues.map((clue, clueIdx) =>
          catIdx === ci && clueIdx === vi ? { ...clue, used } : clue,
        ),
      })),
    )
  }

  function updateScore(name, delta) {
    setScores((prev) => ({
      ...prev,
      [name]: (prev[name] || 0) + delta,
    }))
  }

  function setPlayerName(index, value) {
    setPlayers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function saveEditorChanges(updatedCat) {
    const sanitizedCat = {
      ...updatedCat,
      name: sanitizePlainText(updatedCat.name, 60),
      clues: updatedCat.clues.map((clue) => ({
        ...clue,
        answer: sanitizePlainText(clue.answer, 240),
        question: sanitizePlainText(clue.question, 240),
        mediaUrl: sanitizeYouTubeUrl(clue.mediaUrl || ''),
      })),
    }

    setCategories((prev) => {
      const next = [...prev]
      next[editingCat] = sanitizedCat
      return next
    })
    editorSavedFlag.trigger()
  }

  function savePlayers() {
    setPlayers((prev) => prev.map((name, i) => name.trim() || `Team ${i + 1}`))
    playersSavedFlag.trigger()
  }

  function closeBoardClue() {
    setActiveClue(null)
    setHomeBoardReveal(false)
  }

  function markActiveClueUsedAndReturn() {
    if (!activeClue) return
    markClueUsed(activeClue.ci, activeClue.vi, true)
    closeBoardClue()
  }

  function openHostSelection(ci, vi) {
    setHostSelection({ ci, vi })
  }

  function sendSelectionToPlayer(revealAnswer = false) {
    if (!hostSelection) return
    setActiveClue(hostSelection)
    setHostClueState(revealAnswer ? 'revealed' : 'hidden')
  }

  function resetCategoriesToDefault() {
    setCategories(cloneDefaultCategories())
    setEditingCat(0)
  }

  function resetScores() {
    setScores({})
  }

  function connectPlayer(teamIndex) {
    const playerId = `player_${Date.now()}_${Math.random()}`
    setConnectedPlayerId(playerId)
    setBuzzers((prev) => {
      const next = {
        ...prev,
        [playerId]: {
          teamIndex,
          buzzedIn: false,
          buzzTime: null,
        },
      }
      writeRemoteBuzzers(next)
      return next
    })
    setView('buzzer')
  }

  function buzzIn() {
    if (!connectedPlayerId || buzzers[connectedPlayerId]?.buzzedIn) return
    setBuzzers((prev) => {
      const next = {
        ...prev,
        [connectedPlayerId]: {
          ...prev[connectedPlayerId],
          buzzedIn: true,
          buzzTime: Date.now(),
        },
      }
      writeRemoteBuzzers(next)
      return next
    })
  }

  function resetBuzzer(playerId) {
    setBuzzers((prev) => {
      const next = {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          buzzedIn: false,
          buzzTime: null,
        },
      }
      writeRemoteBuzzers(next)
      return next
    })
  }

  function resetAllBuzzers() {
    setBuzzers((prev) => {
      const updated = {}
      Object.keys(prev).forEach((id) => {
        updated[id] = {
          ...prev[id],
          buzzedIn: false,
          buzzTime: null,
        }
      })
      writeRemoteBuzzers(updated)
      return updated
    })
  }

  function disconnectPlayer() {
    setBuzzers((prev) => {
      const updated = { ...prev }
      delete updated[connectedPlayerId]
      writeRemoteBuzzers(updated)
      return updated
    })
    setConnectedPlayerId(null)
    setView('home')
  }

  function regenerateRoomCode() {
    const nextRoomCode = createRoomCode()
    setRoomCode(nextRoomCode)
    setBuzzers({})

    if (isRemoteSyncEnabled) {
      const resetUrl = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(nextRoomCode)}/buzzers.json`
      fetch(resetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {})
    }
  }

  return {
    state: {
      view,
      roomCode,
      isRemoteSyncEnabled,
      firebaseStatus,
      categories,
      scores,
      players,
      activeClue,
      hostClueState,
      editingCat,
      hostSelection,
      homeBoardReveal,
      boardReady,
      connectedPlayerId,
      buzzers,
    },
    derived: {
      activePlayers,
      editorSaved: editorSavedFlag.isActive,
      playersSaved: playersSavedFlag.isActive,
    },
    actions: {
      setView,
      setEditingCat,
      setHomeBoardReveal,
      setBoardReady,
      showClue,
      closeBoardClue,
      markClueUsed,
      markActiveClueUsedAndReturn,
      updateScore,
      setPlayerName,
      saveEditorChanges,
      savePlayers,
      openHostSelection,
      sendSelectionToPlayer,
      resetCategoriesToDefault,
      resetScores,
      regenerateRoomCode,
      connectPlayer,
      buzzIn,
      resetBuzzer,
      resetAllBuzzers,
      disconnectPlayer,
    },
  }
}

export default useJeopardyGame
