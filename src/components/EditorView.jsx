import { useEffect, useState } from 'react'
import { POINT_VALUES } from '../data/gameData'
import { isPotentiallyUnsafeText, sanitizePlainText } from '../utils/inputSecurity'
import { isSafeYouTubeUrl, sanitizeYouTubeUrl } from '../utils/youtube'

function EditorView({
  categories,
  editingCat,
  setEditingCat,
  onHome,
  onSave,
  onReset,
  showSaved,
}) {
  const cat = categories[editingCat]
  const [draftName, setDraftName] = useState(cat.name)
  const [draftClues, setDraftClues] = useState(cat.clues)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDraftName(cat.name)
      setDraftClues(cat.clues)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [cat])

  function syncDraft(i) {
    const nextCat = categories[i]
    setDraftName(nextCat.name)
    setDraftClues(nextCat.clues)
    setEditingCat(i)
  }

  const hasInvalidMediaUrl = draftClues.some(
    (clue) => clue.mediaUrl && !isSafeYouTubeUrl(clue.mediaUrl),
  )
  const hasUnsafeText =
    isPotentiallyUnsafeText(draftName) ||
    draftClues.some(
      (clue) =>
        isPotentiallyUnsafeText(clue.answer) || isPotentiallyUnsafeText(clue.question),
    )

  return (
    <div className="page panel-page">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <h2>Edit Questions</h2>
        <div />
      </div>

      <div className="tab-row">
        {categories.map((item, idx) => (
          <button
            key={item.name + idx}
            className={`tab ${idx === editingCat ? 'active' : ''}`}
            onClick={() => syncDraft(idx)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="editor-card">
        <label>Category Name</label>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={(e) => setDraftName(sanitizePlainText(e.target.value, 60))}
        />
      </div>

      {draftClues.map((clue, vi) => (
        <div className="editor-card" key={`draft-${vi}`}>
          <div className="pts">${POINT_VALUES[vi]}</div>
          <label>Clue - what players read</label>
          <textarea
            rows={2}
            value={clue.answer}
            onChange={(e) => {
              setDraftClues((prev) =>
                prev.map((item, idx) => (idx === vi ? { ...item, answer: e.target.value } : item)),
              )
            }}
            onBlur={(e) => {
              const sanitized = sanitizePlainText(e.target.value, 240)
              setDraftClues((prev) =>
                prev.map((item, idx) => (idx === vi ? { ...item, answer: sanitized } : item)),
              )
            }}
          />
          <label>Correct Question - host answer</label>
          <textarea
            rows={2}
            value={clue.question}
            onChange={(e) => {
              setDraftClues((prev) =>
                prev.map((item, idx) =>
                  idx === vi ? { ...item, question: e.target.value } : item,
                ),
              )
            }}
            onBlur={(e) => {
              const sanitized = sanitizePlainText(e.target.value, 240)
              setDraftClues((prev) =>
                prev.map((item, idx) => (idx === vi ? { ...item, question: sanitized } : item)),
              )
            }}
          />
          <label>Music Clip Link (YouTube URL with optional start/end)</label>
          <input
            value={clue.mediaUrl || ''}
            onChange={(e) => {
              setDraftClues((prev) =>
                prev.map((item, idx) =>
                  idx === vi ? { ...item, mediaUrl: e.target.value } : item,
                ),
              )
            }}
            onBlur={(e) => {
              const sanitized = sanitizeYouTubeUrl(e.target.value)
              if (!sanitized && e.target.value.trim()) {
                return
              }

              setDraftClues((prev) =>
                prev.map((item, idx) =>
                  idx === vi ? { ...item, mediaUrl: sanitized } : item,
                ),
              )
            }}
            placeholder="https://www.youtube.com/watch?v=VIDEO_ID&t=30s&end=60"
          />
          {clue.mediaUrl && !isSafeYouTubeUrl(clue.mediaUrl) && (
            <div className="small-meta">
              Invalid link. Use an https YouTube URL from youtube.com or youtu.be.
            </div>
          )}
        </div>
      ))}

      <div className="action-row">
        <button
          className="btn btn-gold"
          disabled={hasInvalidMediaUrl || hasUnsafeText}
          onClick={() => {
            onSave({
              name: sanitizePlainText(draftName, 60) || cat.name,
              clues: draftClues.map((clue) => ({
                ...clue,
                answer: sanitizePlainText(clue.answer, 240),
                question: sanitizePlainText(clue.question, 240),
                mediaUrl: sanitizeYouTubeUrl(clue.mediaUrl || ''),
              })),
            })
          }}
        >
          Save Changes
        </button>
        <button className="btn btn-outline" onClick={onReset}>
          Reset Defaults
        </button>
      </div>
      {hasUnsafeText && (
        <div className="small-meta">
          Potentially unsafe text detected. Remove HTML-like tags or script-style text
          before saving.
        </div>
      )}
      {showSaved && <div className="saved">Changes saved!</div>}
    </div>
  )
}

export default EditorView