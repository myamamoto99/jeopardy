import { useEffect, useMemo, useState } from 'react'
import BoardGrid from './BoardGrid'
import { POINT_VALUES } from '../data/gameData'
import { buildYouTubeEmbedUrl } from '../utils/youtube'

function HostView({
  categories,
  hostSelection,
  activePlayers,
  scores,
  players,
  buzzers,
  onHome,
  onSelectClue,
  onSendToPlayer,
  onRevealOnPlayer,
  onMarkUsed,
  onResetUnused,
  onUpdateScore,
  onResetBuzzer,
  onResetAllBuzzers,
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
        {activePlayers.map((name) => {
          const clueValue = hostSelection ? POINT_VALUES[hostSelection.vi] : 0
          return (
            <div key={`host-${name}`} className="score-pill">
              <div className="score-name">{name}</div>
              <div className="score-value">${(scores[name] || 0).toLocaleString()}</div>
              <div className="mini-actions">
                <button
                  onClick={() => onUpdateScore(name, clueValue)}
                  disabled={!hostSelection}
                >
                  +${clueValue}
                </button>
                <button
                  onClick={() => onUpdateScore(name, -clueValue)}
                  disabled={!hostSelection}
                >
                  -${clueValue}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="section-label">Buzzers</h3>
      <div className="buzzer-status-row">
        {Object.entries(buzzers).map(([playerId, buzzer]) => {
          const teamName = players[buzzer.teamIndex] || `Team ${buzzer.teamIndex + 1}`
          const buzzedInPlayers = Object.entries(buzzers)
            .filter(([, b]) => b.buzzedIn)
            .sort(([, a], [, b]) => (a.buzzTime || 0) - (b.buzzTime || 0))
          const buzzerRank = buzzedInPlayers.findIndex(([id]) => id === playerId) + 1

          return (
            <div key={`buzzer-${playerId}`} className={`buzzer-status-pill ${buzzer.buzzedIn ? 'buzzed-in' : ''}`}>
              <div className="buzzer-team">{teamName}</div>
              {buzzer.buzzedIn && (
                <div className="buzzer-rank">#{buzzerRank}</div>
              )}
              <button
                className="btn btn-outline mini-reset-btn"
                onClick={() => onResetBuzzer(playerId)}
              >
                Reset
              </button>
            </div>
          )
        })}
      </div>
      {Object.keys(buzzers).length > 0 && (
        <button
          className="btn btn-gold"
          onClick={onResetAllBuzzers}
          style={{ marginTop: '10px', width: '100%' }}
        >
          Reset All Buzzers
        </button>
      )}
    </div>
  )
}

export default HostView