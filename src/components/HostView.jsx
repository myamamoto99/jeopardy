import { useEffect, useMemo, useState } from 'react'
import BoardGrid from './BoardGrid'
import { POINT_VALUES } from '../data/gameData'
import { buildYouTubeEmbedUrl } from '../utils/youtube'

function HostView({
  categories,
  hostSelection,
  activePlayers,
  scores,
  onHome,
  onSelectClue,
  onSendToPlayer,
  onRevealOnPlayer,
  onMarkUsed,
  onResetUnused,
  onUpdateScore,
}) {
  const [playNonce, setPlayNonce] = useState(0)

  const selectedClue = hostSelection
    ? categories[hostSelection.ci].clues[hostSelection.vi]
    : null

  const embedUrl = useMemo(
    () => buildYouTubeEmbedUrl(selectedClue?.mediaUrl || ''),
    [selectedClue],
  )

  useEffect(() => {
    setPlayNonce(0)
  }, [hostSelection?.ci, hostSelection?.vi])

  return (
    <div className="page board-page">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <h2>Host View</h2>
        <span className="host-badge">HOST ONLY</span>
      </div>

      <div className="info-panel">
        Click a clue to control what appears on the player screen, then award points
        below.
      </div>

      <BoardGrid
        categories={categories}
        compact
        onClueClick={onSelectClue}
        getCellProps={({ clue, pts, compact }) => ({
          className: `clue-cell ${compact ? 'compact' : ''} ${clue.used ? 'used-host' : ''}`,
          disabled: false,
          label: clue.used ? 'used' : `$${pts}`,
        })}
      />

      {hostSelection && (
        <div className="host-panel">
          <div className="small-meta">
            {categories[hostSelection.ci].name} · ${POINT_VALUES[hostSelection.vi]}
          </div>
          <p>
            <strong>Clue:</strong> {categories[hostSelection.ci].clues[hostSelection.vi].answer}
          </p>
          <p>
            <strong>Correct question:</strong>{' '}
            {categories[hostSelection.ci].clues[hostSelection.vi].question}
          </p>
          <p>
            <strong>Music link:</strong> {selectedClue.mediaUrl ? 'Added' : 'Not set'}
          </p>
          <div className="action-row">
            <button className="btn btn-blue" onClick={onSendToPlayer}>
              Send to Player Screen
            </button>
            <button className="btn btn-outline" onClick={onRevealOnPlayer}>
              Reveal on Player Screen
            </button>
            <button
              className="btn btn-blue"
              onClick={() => setPlayNonce((prev) => prev + 1)}
              disabled={!embedUrl}
            >
              Play Clip
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setPlayNonce(0)}
              disabled={playNonce === 0}
            >
              Stop Clip
            </button>
            <button className="btn btn-gold" onClick={onMarkUsed}>
              Mark Used
            </button>
            <button className="btn btn-outline" onClick={onResetUnused}>
              Reset Unused
            </button>
          </div>

          {!embedUrl && selectedClue.mediaUrl && (
            <div className="small-meta">
              This link is not a supported YouTube URL. Use a youtu.be or youtube.com
              link.
            </div>
          )}

          {playNonce > 0 && embedUrl && (
            <div className="clip-player">
              <iframe
                key={`${hostSelection.ci}-${hostSelection.vi}-${playNonce}`}
                src={embedUrl}
                title="Clue music clip"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      <h3 className="section-label">Scores</h3>
      <div className="score-row">
        {activePlayers.map((name) => (
          <div key={`host-${name}`} className="score-pill">
            <div className="score-name">{name}</div>
            <div className="score-value">${(scores[name] || 0).toLocaleString()}</div>
            <div className="mini-actions">
              {POINT_VALUES.map((pts) => (
                <button key={`${name}-${pts}`} onClick={() => onUpdateScore(name, pts)}>
                  +${pts}
                </button>
              ))}
              <button onClick={() => onUpdateScore(name, -200)}>-200</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HostView