import { useEffect, useMemo, useState } from 'react'
import { cloneDefaultCategories } from '../data/gameData'
import { sanitizePlainText } from '../utils/inputSecurity'
import useTimedFlag from './useTimedFlag'
import { sanitizeYouTubeUrl } from '../utils/youtube'

const CATEGORIES_STORAGE_KEY = 'jeopardy.categories.v1'

function normalizeCategoriesForStorage(categories) {
  return categories.map((cat) => ({
    name: sanitizePlainText(cat.name, 60),
    clues: cat.clues.map((clue) => ({
      answer: sanitizePlainText(clue.answer, 240),
      question: sanitizePlainText(clue.question, 240),
      mediaUrl: sanitizeYouTubeUrl(clue.mediaUrl || ''),
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
          used: false,
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

function useJeopardyGame() {
  const [view, setView] = useState('home')
  const [categories, setCategories] = useState(loadInitialCategories)
  const [scores, setScores] = useState({})
  const [players, setPlayers] = useState(['Team 1', 'Team 2', 'Team 3'])
  const [activeClue, setActiveClue] = useState(null)
  const [hostClueState, setHostClueState] = useState('hidden')
  const [editingCat, setEditingCat] = useState(0)
  const [hostSelection, setHostSelection] = useState(null)
  const [homeBoardReveal, setHomeBoardReveal] = useState(false)

  const editorSavedFlag = useTimedFlag(2000)
  const playersSavedFlag = useTimedFlag(2000)

  const activePlayers = useMemo(
    () => players.map((name, idx) => name || `Team ${idx + 1}`),
    [players],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const serializable = normalizeCategoriesForStorage(categories)
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(serializable))
  }, [categories])

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
    setView('player')
  }

  function resetCategoriesToDefault() {
    setCategories(cloneDefaultCategories())
    setEditingCat(0)
  }

  function resetScores() {
    setScores({})
  }

  return {
    state: {
      view,
      categories,
      scores,
      players,
      activeClue,
      hostClueState,
      editingCat,
      hostSelection,
      homeBoardReveal,
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
    },
  }
}

export default useJeopardyGame