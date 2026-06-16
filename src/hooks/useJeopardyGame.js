import { useEffect, useMemo, useRef, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref as dbRef, set as dbSet } from 'firebase/database'
import { cloneDefaultCategories } from '../data/gameData'
import { sanitizePlainText } from '../utils/inputSecurity'
import useTimedFlag from './useTimedFlag'
import { sanitizeYouTubeUrl } from '../utils/youtube'
import { sanitizeImageUrl } from '../utils/image'
import { useCrossTabSync } from './useCrossTabSync'

const CATEGORIES_STORAGE_KEY = 'jeopardy.categories.v1'
const FIREBASE_DB_URL = (process.env.NEXT_PUBLIC_FIREBASE_DB_URL || '').replace(/\/$/, '')

// Firebase SDK uses WebSocket for writes — avoids CORS preflight that blocks REST PUT requests
let _firebaseDb = null
function getFirebaseDb() {
  if (typeof window === 'undefined' || !FIREBASE_DB_URL) return null
  if (_firebaseDb) return _firebaseDb
  try {
    const apps = getApps()
    const app = apps.length > 0 ? apps[0] : initializeApp({ databaseURL: FIREBASE_DB_URL })
    _firebaseDb = getDatabase(app)
  } catch (err) {
    console.error('[Firebase SDK] Init failed:', err)
  }
  return _firebaseDb
}
const DEFAULT_CATEGORIES = cloneDefaultCategories()
const CATEGORY_COUNT = DEFAULT_CATEGORIES.length
const CLUE_COUNT = DEFAULT_CATEGORIES[0]?.clues?.length || 5


function createFirebaseSafeId(prefix) {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2)

  return `${prefix}_${Date.now().toString(36)}_${randomPart}`
}

function buildEmptyUsedMap() {
  return DEFAULT_CATEGORIES.map((cat) => cat.clues.map(() => false))
}

function normalizeUsedMap(raw) {
  const empty = buildEmptyUsedMap()
  if (!Array.isArray(raw)) {
    return empty
  }

  return empty.map((row, ci) =>
    row.map((_, vi) => raw?.[ci]?.[vi] === true),
  )
}

function extractUsedMapFromCategories(categories) {
  return buildEmptyUsedMap().map((row, ci) =>
    row.map((_, vi) => categories?.[ci]?.clues?.[vi]?.used === true),
  )
}

function applyUsedMapToCategories(baseCategories, usedMap) {
  const normalizedBase = buildCategoriesFromStoredValue(baseCategories)
  const normalizedUsed = normalizeUsedMap(usedMap)

  return normalizedBase.map((cat, ci) => ({
    ...cat,
    clues: cat.clues.map((clue, vi) => ({
      ...clue,
      used: normalizedUsed[ci][vi],
    })),
  }))
}

function clearUsedFlags(categories) {
  return buildCategoriesFromStoredValue(categories).map((cat) => ({
    ...cat,
    clues: cat.clues.map((clue) => ({ ...clue, used: false })),
  }))
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
      imageUrl: sanitizeImageUrl(clue.imageUrl || ''),
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
          imageUrl:
            typeof savedClue.imageUrl === 'string'
              ? sanitizeImageUrl(savedClue.imageUrl)
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
    const safeName = sanitizePlainText(name, 60).trim()
    if (!safeName) {
      return acc
    }

    const numeric = Number(value)
    acc[safeName] = Number.isFinite(numeric) ? numeric : 0
    return acc
  }, {})
}

function normalizePlayers(raw) {
  const fallback = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5']
  if (!Array.isArray(raw)) {
    return fallback
  }

  const next = raw
    .slice(0, 8)
    .map((name, idx) => sanitizePlainText(typeof name === 'string' ? name : `Team ${idx + 1}`, 60).trim())
    .map((name, idx) => name || `Team ${idx + 1}`)

  return next.length > 0 ? next : fallback
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
    activeBoardId:
      sanitizePlainText(typeof raw.activeBoardId === 'string' ? raw.activeBoardId : '', 40) ||
      null,
    roomUsedMap: normalizeUsedMap(
      raw.roomUsedMap ||
        extractUsedMapFromCategories(buildCategoriesFromStoredValue(raw.categories)),
    ),
    scores: normalizeScores(raw.scores),
    players: normalizePlayers(raw.players),
    activeClue: normalizeSelection(raw.activeClue),
    hostClueState: raw.hostClueState === 'revealed' ? 'revealed' : 'hidden',
    hostSelection: normalizeSelection(raw.hostSelection),
    homeBoardReveal: raw.homeBoardReveal === true,
    boardReady: raw.boardReady === true,
  }
}

function normalizeBoardLibrary(raw) {
  const fallbackCatalog = [{ id: 'board-1', name: 'Board 1' }]
  const fallbackMap = { 'board-1': cloneDefaultCategories() }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      boardCatalog: fallbackCatalog,
      boardCategoriesById: fallbackMap,
    }
  }

  const rawCatalog = Array.isArray(raw.boardCatalog) ? raw.boardCatalog : []
  const boardCatalog = rawCatalog
    .map((item, idx) => {
      const id = sanitizePlainText(typeof item?.id === 'string' ? item.id : '', 40)
      const name = sanitizePlainText(typeof item?.name === 'string' ? item.name : '', 60)
      if (!id || !name) {
        return null
      }

      return {
        id,
        name: name || `Board ${idx + 1}`,
      }
    })
    .filter(Boolean)

  const normalizedCatalog = boardCatalog.length > 0 ? boardCatalog : fallbackCatalog

  const rawBoardMap = raw.boardCategoriesById && typeof raw.boardCategoriesById === 'object'
    ? raw.boardCategoriesById
    : {}

  const boardCategoriesById = normalizedCatalog.reduce((acc, board) => {
    acc[board.id] = buildCategoriesFromStoredValue(rawBoardMap[board.id])
    return acc
  }, {})

  if (!boardCategoriesById[normalizedCatalog[0].id]) {
    boardCategoriesById[normalizedCatalog[0].id] = cloneDefaultCategories()
  }

  return {
    boardCatalog: normalizedCatalog,
    boardCategoriesById,
  }
}

function buildRemoteBoardLibraryPayload(boardCatalog, boardCategoriesById) {
  return {
    boardCatalog,
    boardCategoriesById: Object.fromEntries(
      Object.entries(boardCategoriesById).map(([boardId, boardCategories]) => [
        boardId,
        normalizeCategoriesForStorage(clearUsedFlags(boardCategories)),
      ]),
    ),
  }
}

function applyFirebasePathUpdate(baseValue, path, data, mergeRoot = false) {
  if (!path) {
    return data
  }

  if (path === '/') {
    if (!mergeRoot) {
      return data
    }

    if (data === null) {
      return {}
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data
    }

    const next =
      baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)
        ? JSON.parse(JSON.stringify(baseValue))
        : {}

    Object.entries(data).forEach(([key, value]) => {
      if (value === null) {
        delete next[key]
      } else {
        next[key] = value
      }
    })

    return next
  }

  const segments = path.replace(/^\//, '').split('/').filter(Boolean)
  const next =
    baseValue && typeof baseValue === 'object'
      ? JSON.parse(JSON.stringify(baseValue))
      : {}

  let cursor = next
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {}
    }
    cursor = cursor[key]
  }

  const finalKey = segments[segments.length - 1]
  if (data === null) {
    delete cursor[finalKey]
  } else {
    cursor[finalKey] = data
  }

  return next
}

function useJeopardyGame() {
  const isRemoteSyncEnabled = Boolean(FIREBASE_DB_URL)
  
  // Test Firebase connectivity once on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !isRemoteSyncEnabled) return
    
    const testUrl = `${FIREBASE_DB_URL}/gameState.json`
    console.log('[useJeopardyGame] Testing Firebase connectivity with GET to:', testUrl)
    fetch(testUrl, { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then((res) => {
        console.log('[useJeopardyGame] GET test response:', res.status, res.ok)
      })
      .catch((err) => {
        console.error('[useJeopardyGame] GET test error:', err.message || err)
      })
  }, []) // Only run once on mount
  
  const applyingRemoteGameRef = useRef(false)
  const lastSyncedGameStateRef = useRef('')
  const gameStateSnapshotRef = useRef(null)
  const buzzersSnapshotRef = useRef({})
  const applyingRemoteBoardsRef = useRef(false)
  const lastSyncedBoardLibraryRef = useRef('')
  const didHydrateLocalCategoriesRef = useRef(false)
  const viewRef = useRef('home')
  const remoteHydratedRef = useRef(false)

  const [view, setView] = useState('home')
  const [categories, setCategories] = useState(() => cloneDefaultCategories())
  const [boardCatalog, setBoardCatalog] = useState([{ id: 'board-1', name: 'Board 1' }])
  const [boardCategoriesById, setBoardCategoriesById] = useState(() => ({
    'board-1': cloneDefaultCategories(),
  }))
  const [activeBoardId, setActiveBoardId] = useState('board-1')
  const [roomUsedMap, setRoomUsedMap] = useState(buildEmptyUsedMap)
  const [scores, setScores] = useState({})
  const [players, setPlayers] = useState(['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5'])
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
      activeBoardId,
      roomUsedMap,
      scores,
      players,
      activeClue,
      hostClueState,
      hostSelection,
      homeBoardReveal,
      boardReady,
    }),
    [
      activeBoardId,
      roomUsedMap,
      scores,
      players,
      activeClue,
      hostClueState,
      hostSelection,
      homeBoardReveal,
      boardReady,
    ],
  )

  useEffect(() => {
    gameStateSnapshotRef.current = remoteGameState
  }, [remoteGameState])

  useEffect(() => {
    console.log('[boardReady changed] boardReady:', boardReady, 'view:', view)
  }, [boardReady])

  useEffect(() => {
    console.log('[view changed] view:', view)
    viewRef.current = view
  }, [view])

  useEffect(() => {
    buzzersSnapshotRef.current = buzzers
  }, [buzzers])

  const remoteBoardLibrary = useMemo(
    () => buildRemoteBoardLibraryPayload(boardCatalog, boardCategoriesById),
    [boardCatalog, boardCategoriesById],
  )

  useCrossTabSync('categories', isRemoteSyncEnabled ? undefined : categories, (newCategories) => {
    if (isRemoteSyncEnabled) return
    setCategories(newCategories)
  })

  useCrossTabSync('scores', isRemoteSyncEnabled ? undefined : scores, (newScores) => {
    if (isRemoteSyncEnabled) return
    setScores(newScores)
  })

  useCrossTabSync('players', isRemoteSyncEnabled ? undefined : players, (newPlayers) => {
    if (isRemoteSyncEnabled) return
    setPlayers(newPlayers)
  })

  useCrossTabSync('activeClue', isRemoteSyncEnabled ? undefined : activeClue, (newActiveClue) => {
    if (isRemoteSyncEnabled) return
    setActiveClue(newActiveClue)
  })

  useCrossTabSync(
    'hostClueState',
    isRemoteSyncEnabled ? undefined : hostClueState,
    (newHostClueState) => {
      if (isRemoteSyncEnabled) return
      setHostClueState(newHostClueState)
    },
  )

  useCrossTabSync(
    'hostSelection',
    isRemoteSyncEnabled ? undefined : hostSelection,
    (newHostSelection) => {
      if (isRemoteSyncEnabled) return
      setHostSelection(newHostSelection)
    },
  )

  useCrossTabSync(
    'homeBoardReveal',
    isRemoteSyncEnabled ? undefined : homeBoardReveal,
    (newHomeBoardReveal) => {
      if (isRemoteSyncEnabled) return
      setHomeBoardReveal(newHomeBoardReveal)
    },
  )

  useCrossTabSync('boardReady', isRemoteSyncEnabled ? undefined : boardReady, (newBoardReady) => {
    if (isRemoteSyncEnabled) return
    setBoardReady(newBoardReady)
  })

  useCrossTabSync('buzzers', isRemoteSyncEnabled ? undefined : buzzers, (newBuzzers) => {
    if (isRemoteSyncEnabled) return
    setBuzzers(newBuzzers)
  })

  useEffect(() => {
    if (typeof window === 'undefined' || isRemoteSyncEnabled || didHydrateLocalCategoriesRef.current) {
      return
    }

    const localCategories = loadInitialCategories()
    didHydrateLocalCategoriesRef.current = true
    setCategories(localCategories)
    setRoomUsedMap(extractUsedMapFromCategories(localCategories))
    setBoardCategoriesById((prev) => ({
      ...prev,
      [activeBoardId]: clearUsedFlags(localCategories),
    }))
  }, [isRemoteSyncEnabled, activeBoardId])

  function writeRemoteBoardLibrary(nextLibrary) {
    if (!isRemoteSyncEnabled) return
    lastSyncedBoardLibraryRef.current = JSON.stringify(nextLibrary)
    const db = getFirebaseDb()
    if (!db) return
    dbSet(dbRef(db, 'boards/library'), nextLibrary)
      .then(() => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'ok', lastError: '', lastWriteAt: Date.now() }))
      })
      .catch((error) => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'error', lastError: error?.message || 'boards write failed' }))
      })
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const serializable = normalizeCategoriesForStorage(categories)
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(serializable))
  }, [categories])

  useEffect(() => {
    if (typeof window === 'undefined' || !isRemoteSyncEnabled) {
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: isRemoteSyncEnabled ? 'idle' : 'disabled',
      }))
      return
    }

    remoteHydratedRef.current = false

    const streamUrl = `${FIREBASE_DB_URL}/gameState.json`
    const source = new EventSource(streamUrl)
    source.onopen = () => {
      console.log('[gameState SSE] Connected to', streamUrl)
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: 'connected',
        lastError: prev.gameStream === 'connected' ? prev.lastError : '',
      }))
    }
    source.onerror = (err) => {
      console.error('[gameState SSE] Error / disconnected', err)
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: 'error',
        lastError: 'Game stream disconnected',
      }))
    }

    const applyEventData = (eventData, mergeRoot = false) => {
      try {
        const payload = JSON.parse(eventData)
        console.log('[gameState SSE] event path:', payload?.path, 'data:', payload?.data)
        if (!payload?.path) {
          return
        }

        const nextRawState = applyFirebasePathUpdate(
          gameStateSnapshotRef.current || {},
          payload.path,
          payload.data,
          mergeRoot,
        )
        const normalized = normalizeRemoteGameState(nextRawState)
        if (!normalized) {
          console.log('[gameState SSE] normalized is null (empty Firebase state), skipping state update')
          return
        }

        console.log('[gameState SSE] applying state: boardReady=', normalized.boardReady, 'activeClue=', normalized.activeClue)
        applyingRemoteGameRef.current = true
        lastSyncedGameStateRef.current = JSON.stringify({
          activeBoardId: normalized.activeBoardId,
          roomUsedMap: normalized.roomUsedMap,
          scores: normalized.scores,
          players: normalized.players,
          activeClue: normalized.activeClue,
          hostClueState: normalized.hostClueState,
          hostSelection: normalized.hostSelection,
          homeBoardReveal: normalized.homeBoardReveal,
          boardReady: normalized.boardReady,
        })

        if (normalized.activeBoardId && viewRef.current !== 'editor') {
          setActiveBoardId(normalized.activeBoardId)
        }
        setRoomUsedMap(normalized.roomUsedMap)
        setScores(normalized.scores)
        setPlayers(normalized.players)
        setActiveClue(normalized.activeClue)
        setHostClueState(normalized.hostClueState)
        setHostSelection(normalized.hostSelection)
        setHomeBoardReveal(normalized.homeBoardReveal)
        setBoardReady(normalized.boardReady)
      } catch (err) {
        console.error('[gameState SSE] applyEventData error:', err)
      } finally {
        applyingRemoteGameRef.current = false
      }
    }

    const handlePut = (event) => {
      console.log('[gameState SSE] put event received')
      remoteHydratedRef.current = true
      applyEventData(event.data, false)
    }
    const handlePatch = (event) => {
      console.log('[gameState SSE] patch event received')
      applyEventData(event.data, true)
    }

    source.addEventListener('put', handlePut)
    source.addEventListener('patch', handlePatch)

    return () => {
      source.removeEventListener('put', handlePut)
      source.removeEventListener('patch', handlePatch)
      source.close()
      setFirebaseStatus((prev) => ({
        ...prev,
        gameStream: isRemoteSyncEnabled ? 'idle' : 'disabled',
      }))
    }
  }, [isRemoteSyncEnabled])

  useEffect(() => {
    if (typeof window === 'undefined' || !isRemoteSyncEnabled) {
      return
    }

    const streamUrl = `${FIREBASE_DB_URL}/boards/library.json`
    const source = new EventSource(streamUrl)

    const applyEventData = (eventData) => {
      try {
        const payload = JSON.parse(eventData)
        if (payload?.path !== '/') {
          return
        }

        const normalized = normalizeBoardLibrary(payload.data)
        const normalizedSerialized = JSON.stringify(normalized)
        if (normalizedSerialized === lastSyncedBoardLibraryRef.current) {
          return
        }

        applyingRemoteBoardsRef.current = true
        lastSyncedBoardLibraryRef.current = normalizedSerialized
        setBoardCatalog(normalized.boardCatalog)
        setBoardCategoriesById(normalized.boardCategoriesById)
        setActiveBoardId((currentBoardId) => {
          if (normalized.boardCategoriesById[currentBoardId]) {
            return currentBoardId
          }

          if (viewRef.current === 'editor') {
            return currentBoardId
          }

          return normalized.boardCatalog[0]?.id || 'board-1'
        })
      } catch {
        // Ignore malformed board library stream payloads.
      } finally {
        applyingRemoteBoardsRef.current = false
      }
    }

    const handlePut = (event) => applyEventData(event.data)

    source.addEventListener('put', handlePut)

    return () => {
      source.removeEventListener('put', handlePut)
      source.close()
    }
  }, [isRemoteSyncEnabled])

  useEffect(() => {
    const base = boardCategoriesById[activeBoardId] || cloneDefaultCategories()
    setCategories(applyUsedMapToCategories(base, roomUsedMap))
  }, [boardCategoriesById, activeBoardId, roomUsedMap])

  useEffect(() => {
    if (!isRemoteSyncEnabled) {
      console.log('[gameState write] Remote sync disabled')
      return
    }

    if (view !== 'host') {
      console.log('[gameState write] Not host view, skipping. view=', view)
      return
    }

    if (view === 'editor') {
      console.log('[gameState write] In editor view, skipping')
      return
    }

    if (typeof window !== 'undefined' && window.location.pathname.includes('/buzzer')) {
      console.log('[gameState write] In buzzer path, skipping')
      return
    }

    if (!remoteHydratedRef.current) {
      console.log('[gameState write] Not yet hydrated from Firebase, skipping')
      return
    }

    const serialized = JSON.stringify(remoteGameState)

    if (applyingRemoteGameRef.current) {
      console.log('[gameState write] Applying remote update, skipping write')
      return
    }

    if (lastSyncedGameStateRef.current === serialized) {
      console.log('[gameState write] No change since last sync, skipping')
      return
    }

    console.log('[gameState write] Writing via Firebase SDK, boardReady:', remoteGameState.boardReady)
    lastSyncedGameStateRef.current = serialized

    const db = getFirebaseDb()
    if (!db) {
      console.error('[gameState write] Firebase SDK not available')
      return
    }

    dbSet(dbRef(db, 'gameState'), remoteGameState)
      .then(() => {
        console.log('[gameState write] Success!')
        setFirebaseStatus((prev) => ({
          ...prev,
          lastWrite: 'ok',
          lastError: '',
          lastWriteAt: Date.now(),
        }))
      })
      .catch((error) => {
        console.error('[gameState write] Error:', error?.name, error?.message)
        setFirebaseStatus((prev) => ({
          ...prev,
          lastWrite: 'error',
          lastError: error?.message || 'gameState write failed',
        }))
      })
  }, [isRemoteSyncEnabled, remoteGameState, view])

  useEffect(() => {
    if (typeof window === 'undefined' || !isRemoteSyncEnabled) {
      setFirebaseStatus((prev) => ({
        ...prev,
        buzzerStream: isRemoteSyncEnabled ? 'idle' : 'disabled',
      }))
      return
    }

    const streamUrl = `${FIREBASE_DB_URL}/players.json`
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

    const applyEventData = (eventData, mergeRoot = false) => {
      try {
        const payload = JSON.parse(eventData)
        const path = payload?.path
        if (!path) {
          return
        }

        const nextRaw = applyFirebasePathUpdate(
          buzzersSnapshotRef.current || {},
          path,
          payload.data,
          mergeRoot,
        )
        const normalized = normalizeBuzzers(nextRaw)
        buzzersSnapshotRef.current = normalized
        setBuzzers(normalized)
      } catch {
        // Ignore malformed stream event payloads.
      }
    }

    const handlePut = (event) => applyEventData(event.data, false)
    const handlePatch = (event) => applyEventData(event.data, true)

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
  }, [isRemoteSyncEnabled])

  function writeRemoteBuzzers(nextBuzzers) {
    if (!isRemoteSyncEnabled) return
    const normalized = normalizeBuzzers(nextBuzzers)
    buzzersSnapshotRef.current = normalized
    const db = getFirebaseDb()
    if (!db) return
    dbSet(dbRef(db, 'players'), normalized)
      .then(() => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'ok', lastError: '', lastWriteAt: Date.now() }))
      })
      .catch((error) => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'error', lastError: error?.message || 'buzzers write failed' }))
      })
  }

  function writeRemoteSingleBuzzer(playerId, value) {
    if (!isRemoteSyncEnabled || !playerId) return

    if (value === null) {
      const next = { ...(buzzersSnapshotRef.current || {}) }
      delete next[playerId]
      buzzersSnapshotRef.current = next
    } else {
      const normalized = normalizeBuzzers({ [playerId]: value })
      if (normalized[playerId]) {
        buzzersSnapshotRef.current = {
          ...(buzzersSnapshotRef.current || {}),
          [playerId]: normalized[playerId],
        }
      }
    }

    const db = getFirebaseDb()
    if (!db) return
    dbSet(dbRef(db, `players/${playerId}`), value)
      .then(() => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'ok', lastError: '', lastWriteAt: Date.now() }))
      })
      .catch((error) => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'error', lastError: error?.message || 'player write failed' }))
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
    setRoomUsedMap((prev) => {
      const next = normalizeUsedMap(prev)
      next[ci][vi] = used
      return next
    })

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

  function saveEditorChanges(updatedCat, options = {}) {
    const { persistRemote = false } = options
    const sanitizedCat = {
      ...updatedCat,
      name: sanitizePlainText(updatedCat.name, 60),
      clues: updatedCat.clues.map((clue) => ({
        ...clue,
        answer: sanitizePlainText(clue.answer, 240),
        question: sanitizePlainText(clue.question, 240),
        mediaUrl: sanitizeYouTubeUrl(clue.mediaUrl || ''),
        imageUrl: sanitizeImageUrl(clue.imageUrl || ''),
        used: false,
      })),
    }

    const baseBoard = boardCategoriesById[activeBoardId] || clearUsedFlags(categories)
    const nextBoard = baseBoard.map((cat, idx) =>
      idx === editingCat ? sanitizedCat : cat,
    )

    const nextBoardMap = {
      ...boardCategoriesById,
      [activeBoardId]: nextBoard,
    }

    setBoardCategoriesById(nextBoardMap)
    setCategories(applyUsedMapToCategories(nextBoard, roomUsedMap))

    if (persistRemote) {
      writeRemoteBoardLibrary(buildRemoteBoardLibraryPayload(boardCatalog, nextBoardMap))
    }

    editorSavedFlag.trigger()
  }

  function selectBoard(boardId) {
    if (!boardId || boardId === activeBoardId) {
      return
    }

    const nextMap = {
      ...boardCategoriesById,
      [activeBoardId]: boardCategoriesById[activeBoardId] || clearUsedFlags(categories),
    }

    setBoardCategoriesById(nextMap)
    setActiveBoardId(boardId)
    setEditingCat(0)
  }

  function addBoard(currentDraftCat) {
    const nextId = `board-${Date.now().toString(36)}`
    const nextName = `Board ${boardCatalog.length + 1}`
    const nextCategories = cloneDefaultCategories()

    const sanitizedDraftCat = currentDraftCat
      ? {
          ...currentDraftCat,
          name: sanitizePlainText(currentDraftCat.name, 60),
          clues: currentDraftCat.clues.map((clue) => ({
            ...clue,
            answer: sanitizePlainText(clue.answer, 240),
            question: sanitizePlainText(clue.question, 240),
            mediaUrl: sanitizeYouTubeUrl(clue.mediaUrl || ''),
            imageUrl: sanitizeImageUrl(clue.imageUrl || ''),
            used: false,
          })),
        }
      : null

    const currentBoard = (boardCategoriesById[activeBoardId] || clearUsedFlags(categories)).map(
      (cat, idx) => (idx === editingCat && sanitizedDraftCat ? sanitizedDraftCat : cat),
    )

    const nextMap = {
      ...boardCategoriesById,
      [activeBoardId]: currentBoard,
      [nextId]: nextCategories,
    }

    const nextCatalog = [...boardCatalog, { id: nextId, name: nextName }]
    setBoardCatalog(nextCatalog)
    setBoardCategoriesById(nextMap)
    setActiveBoardId(nextId)
    setRoomUsedMap(buildEmptyUsedMap())
    setEditingCat(0)
    closeBoardClue()
    setBoardReady(false)
  }

  function renameBoard(boardId, nextName) {
    const safeName = sanitizePlainText(nextName, 60).trim()
    if (!boardId || !safeName) {
      return
    }

    setBoardCatalog((prev) =>
      prev.map((board) =>
        board.id === boardId ? { ...board, name: safeName } : board,
      ),
    )
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

  function resetScores() {
    setScores({})
  }

  function connectPlayer(teamIndex) {
    const playerId = createFirebaseSafeId('player')
    setConnectedPlayerId(playerId)
    setBuzzers((prev) => {
      const value = {
        teamIndex,
        buzzedIn: false,
        buzzTime: null,
      }
      writeRemoteSingleBuzzer(playerId, value)
      return {
        ...prev,
        [playerId]: value,
      }
    })
    setView('buzzer')
  }

  function buzzIn() {
    if (!connectedPlayerId || buzzers[connectedPlayerId]?.buzzedIn) return
    setBuzzers((prev) => {
      const nextValue = {
        ...prev[connectedPlayerId],
        buzzedIn: true,
        buzzTime: Date.now(),
      }
      writeRemoteSingleBuzzer(connectedPlayerId, nextValue)
      return {
        ...prev,
        [connectedPlayerId]: nextValue,
      }
    })
  }

  function resetBuzzer(playerId) {
    setBuzzers((prev) => {
      const nextValue = {
        ...prev[playerId],
        buzzedIn: false,
        buzzTime: null,
      }
      const updated = {
        ...prev,
        [playerId]: nextValue,
      }
      writeRemoteBuzzers(updated)
      return updated
    })
  }

  function resetAllBuzzers() {
    const source = normalizeBuzzers(buzzersSnapshotRef.current || buzzers)
    const updated = {}
    Object.keys(source).forEach((id) => {
      updated[id] = {
        ...source[id],
        buzzedIn: false,
        buzzTime: null,
      }
    })

    setBuzzers(updated)
    writeRemoteBuzzers(updated)
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

  function clearRealtimeGameData() {
    setActiveClue(null)
    setHostSelection(null)
    setHostClueState('hidden')
    setHomeBoardReveal(false)
    setBoardReady(false)
    setBuzzers({})
    buzzersSnapshotRef.current = {}
    setConnectedPlayerId(null)
    setScores({})
    setRoomUsedMap(buildEmptyUsedMap())

    if (!isRemoteSyncEnabled) return

    const db = getFirebaseDb()
    if (!db) return

    Promise.all([
      dbSet(dbRef(db, 'gameState'), null),
      dbSet(dbRef(db, 'players'), {}),
    ])
      .then(() => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'ok', lastError: '', lastWriteAt: Date.now() }))
      })
      .catch((error) => {
        setFirebaseStatus((prev) => ({ ...prev, lastWrite: 'error', lastError: error?.message || 'clear failed' }))
      })
  }

  return {
    state: {
      view,
      isRemoteSyncEnabled,
      firebaseStatus,
      boardCatalog,
      activeBoardId,
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
      resetScores,
      clearRealtimeGameData,
      selectBoard,
      addBoard,
      renameBoard,
      connectPlayer,
      buzzIn,
      resetBuzzer,
      resetAllBuzzers,
      disconnectPlayer,
    },
  }
}

export default useJeopardyGame
