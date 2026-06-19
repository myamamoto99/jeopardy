import { useEffect, useMemo, useRef, useState } from 'react'
import BoardGrid from './BoardGrid'
import { POINT_VALUES } from '../data/gameData'
import { buildYouTubeEmbedUrl } from '../utils/youtube'

function HostView({
  isRemoteSyncEnabled,
  firebaseStatus,
  boardCatalog,
  activeBoardId,
  onSelectGameBoard,
  categories,
  hostSelection,
  activePlayers,
  scores,
  players,
  buzzers,
  boardReady,
  dailyDoublePositions,
  finalJeopardy,
  finalJeopardyState,
  finalJeopardyWagers,
  finalJeopardyAnswers,
  onHome,
  onSelectClue,
  onShowDailyDouble,
  onSendToPlayer,
  onRevealOnPlayer,
  onMarkUsed,
  onResetUnused,
  onUpdateScore,
  onResetBuzzer,
  onResetAllBuzzers,
  onClearRealtimeData,
  onShowJoinLobby,
  onRevealBoard,
  onStartFinalJeopardy,
  onRevealFinalClue,
  onRevealFinalAnswer,
  onEndFinalJeopardy,
  onLockAnswers,
  onStartTimer,
}) {
  const [playNonce, setPlayNonce] = useState(0)
  const [wager, setWager] = useState('1000')
  const [wagerPlayerIdx, setWagerPlayerIdx] = useState(0)
  const [ddSoundNonce, setDdSoundNonce] = useState(0)
  const [ddPending, setDdPending] = useState(false)
  const [fjPlayNonce, setFjPlayNonce] = useState(0)
  const [fjTimerSeconds, setFjTimerSeconds] = useState(null)
  const [fjTimerPending, setFjTimerPending] = useState(false)
  const [fjTimerSoundNonce, setFjTimerSoundNonce] = useState(0)
  const hasLockedAnswersRef = useRef(false)

  const selectedClue = hostSelection
    ? categories[hostSelection.ci].clues[hostSelection.vi]
    : null

  const isDailyDouble =
    hostSelection != null &&
    (dailyDoublePositions || []).some(
      (p) => p.ci === hostSelection.ci && p.vi === hostSelection.vi,
    )

  const embedUrl = useMemo(
    () => buildYouTubeEmbedUrl(selectedClue?.mediaUrl || ''),
    [selectedClue],
  )

  const fjEmbedUrl = useMemo(
    () => buildYouTubeEmbedUrl(finalJeopardy?.mediaUrl || ''),
    [finalJeopardy],
  )

  useEffect(() => {
    setPlayNonce(0)
    setWager('1000')
    setWagerPlayerIdx(0)
    setDdSoundNonce(0)
    setDdPending(false)
  }, [hostSelection?.ci, hostSelection?.vi])

  useEffect(() => {
    setFjPlayNonce(0)
    setFjTimerSeconds(null)
    setFjTimerPending(false)
    hasLockedAnswersRef.current = false
  }, [finalJeopardyState])

  useEffect(() => {
    if (fjTimerSeconds === null || fjTimerSeconds <= 0) return
    const id = setTimeout(() => setFjTimerSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [fjTimerSeconds])

  useEffect(() => {
    if (fjTimerSeconds !== 0 || hasLockedAnswersRef.current) return
    hasLockedAnswersRef.current = true
    onLockAnswers?.()
  }, [fjTimerSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page board-page">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <h2>Host View</h2>
        <span className="host-badge">HOST ONLY</span>
      </div>

      <div className="info-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span>Active board:</span>
        <select
          className="board-select"
          value={activeBoardId}
          onChange={(e) => onSelectGameBoard(e.target.value)}
        >
          {boardCatalog.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
        <span style={{ color: '#7a90b8', fontSize: '12px' }}>Click a clue to control the player screen.</span>
      </div>

      {isRemoteSyncEnabled && (
        <>
          <div className="info-panel" style={{ marginTop: '8px' }}>
            <strong>Realtime:</strong> Global shared game state
            <button
              className="btn btn-outline"
              style={{ marginLeft: '8px' }}
              onClick={() => {
                if (window.confirm('Clear players and game state data?')) {
                  onClearRealtimeData()
                }
              }}
            >
              Clear Stored Game Data
            </button>
          </div>

          <div className="firebase-status-panel">
            <div className="firebase-status-line">
              <span
                className={`status-dot ${firebaseStatus?.envConfigured ? 'ok' : 'error'}`}
              />
              Env: {firebaseStatus?.envConfigured ? 'configured' : 'missing NEXT_PUBLIC_FIREBASE_DB_URL'}
            </div>
            <div className="firebase-status-line">
              <span
                className={`status-dot ${firebaseStatus?.gameStream === 'connected' ? 'ok' : 'warn'}`}
              />
              Game stream: {firebaseStatus?.gameStream || 'idle'}
            </div>
            <div className="firebase-status-line">
              <span
                className={`status-dot ${firebaseStatus?.buzzerStream === 'connected' ? 'ok' : 'warn'}`}
              />
              Buzzer stream: {firebaseStatus?.buzzerStream || 'idle'}
            </div>
            <div className="firebase-status-line">
              <span
                className={`status-dot ${firebaseStatus?.lastWrite === 'ok' ? 'ok' : firebaseStatus?.lastWrite === 'error' ? 'error' : 'warn'}`}
              />
              Last write: {firebaseStatus?.lastWrite || 'idle'}
              {firebaseStatus?.lastWriteAt ? ` at ${new Date(firebaseStatus.lastWriteAt).toLocaleTimeString()}` : ''}
            </div>
            {firebaseStatus?.lastError && (
              <div className="firebase-status-error">{firebaseStatus.lastError}</div>
            )}
          </div>
        </>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="btn btn-gold" onClick={onRevealBoard} disabled={boardReady}>
          {boardReady ? 'Board Revealed' : 'Reveal Board (Everyone Ready?)'}
        </button>
        <button className="btn btn-outline" onClick={onShowJoinLobby} disabled={!boardReady}>
          Back to Join Lobby (Show QR)
        </button>
      </div>

      <BoardGrid
        categories={categories}
        compact
        onClueClick={onSelectClue}
        getCellProps={({ clue, ci, vi, pts, compact }) => {
          const isDD = (dailyDoublePositions || []).some((p) => p.ci === ci && p.vi === vi)
          return {
            className: `clue-cell ${compact ? 'compact' : ''} ${clue.used ? 'used-host' : ''} ${
              hostSelection?.ci === ci && hostSelection?.vi === vi ? 'selected-host' : ''
            } ${isDD && !clue.used ? 'daily-double-cell' : ''}`,
            disabled: false,
            label: clue.used ? 'used' : `$${pts}`,
          }
        }}
      />

      {hostSelection && (
        <div className="host-panel">
          <div className="small-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>{categories[hostSelection.ci].name} · ${POINT_VALUES[hostSelection.vi]}</span>
            {isDailyDouble && (
              <span className="daily-double-badge">DAILY DOUBLE</span>
            )}
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
          <p>
            <strong>Image:</strong> {selectedClue.imageUrl ? 'Added' : 'Not set'}
          </p>
          {isDailyDouble && (
            <div className="daily-double-wager">
              <div className="section-label" style={{ marginTop: '10px' }}>Daily Double Wager</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                <select
                  className="board-select"
                  value={wagerPlayerIdx}
                  onChange={(e) => {
                    const idx = Number(e.target.value)
                    setWagerPlayerIdx(idx)
                    const maxW = Math.max(1000, scores[activePlayers[idx]] || 0)
                    setWager((prev) => String(Math.min(Number(prev), maxW)))
                  }}
                >
                  {activePlayers.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="board-select"
                  style={{ width: '110px' }}
                  min={0}
                  max={Math.max(1000, scores[activePlayers[wagerPlayerIdx]] || 0)}
                  value={wager}
                  onChange={(e) => setWager(e.target.value)}
                  onBlur={() => {
                    const maxW = Math.max(1000, scores[activePlayers[wagerPlayerIdx]] || 0)
                    const clamped = Math.max(0, Math.min(Number(wager) || 0, maxW))
                    setWager(String(clamped))
                  }}
                />
                <span className="small-meta">
                  max ${Math.max(1000, scores[activePlayers[wagerPlayerIdx]] || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          {selectedClue.imageUrl && (
            <div className="clip-player">
              <img
                src={selectedClue.imageUrl}
                alt="Clue image"
                className="clue-image"
              />
            </div>
          )}
          <div className="action-row">
            {isDailyDouble && (
              <button
                className="btn"
                style={{ background: '#c0392b', borderColor: '#c0392b' }}
                disabled={ddPending}
                onClick={() => {
                  setDdSoundNonce((n) => n + 1)
                  setDdPending(true)
                  setTimeout(() => {
                    onShowDailyDouble()
                    setDdPending(false)
                  }, 1500)
                }}
              >
                Show Daily Double
              </button>
            )}
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

          {ddSoundNonce > 0 && (
            <iframe
              key={ddSoundNonce}
              src="https://www.youtube.com/embed/cv14hwi0QrI?autoplay=1"
              width="1"
              height="1"
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              allow="autoplay"
              title="Daily Double sound"
            />
          )}

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
        {activePlayers.map((name, idx) => {
          const pointValue = hostSelection ? POINT_VALUES[hostSelection.vi] : 0
          const isDDForThisPlayer = isDailyDouble && idx === wagerPlayerIdx
          const clueValue = isDDForThisPlayer ? (Number(wager) || 0) : pointValue
          return (
            <div
              key={`host-${name}`}
              className={`score-pill ${isDDForThisPlayer ? 'daily-double-player' : ''}`}
            >
              <div className="score-name">{name}</div>
              <div className="score-value">${(scores[name] || 0).toLocaleString()}</div>
              <div className="mini-actions">
                <button
                  onClick={() => onUpdateScore(name, clueValue)}
                  disabled={!hostSelection}
                >
                  +${clueValue.toLocaleString()}
                </button>
                <button
                  onClick={() => onUpdateScore(name, -clueValue)}
                  disabled={!hostSelection}
                >
                  -${clueValue.toLocaleString()}
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

      <h3 className="section-label">Final Jeopardy</h3>
      <div className="final-jeopardy-panel">
        {!finalJeopardyState ? (
          <>
            <div className="small-meta" style={{ marginBottom: '10px' }}>
              Category: <strong>{finalJeopardy?.category || 'Not set'}</strong>
            </div>
            <button className="btn btn-gold" onClick={onStartFinalJeopardy} disabled={!finalJeopardy?.category}>
              Start Final Jeopardy
            </button>
            {!finalJeopardy?.category && (
              <div className="small-meta" style={{ marginTop: '6px' }}>Set the category in Edit Questions first.</div>
            )}
          </>
        ) : (
          <>
            <div className="small-meta" style={{ marginBottom: '8px' }}>
              Category: <strong>{finalJeopardy?.category}</strong>
              {' · '}State: <strong>{finalJeopardyState}</strong>
            </div>

            <div className="action-row" style={{ marginBottom: '12px' }}>
              {finalJeopardyState === 'wagering' && (
                <button className="btn btn-blue" onClick={onRevealFinalClue}>
                  Reveal Clue
                </button>
              )}
              {finalJeopardyState === 'clue' && (
                <button className="btn btn-blue" onClick={onRevealFinalAnswer}>
                  Reveal Answer
                </button>
              )}
              <button
                className="btn btn-blue"
                onClick={() => setFjPlayNonce((n) => n + 1)}
                disabled={!fjEmbedUrl}
              >
                Play Clip
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setFjPlayNonce(0)}
                disabled={fjPlayNonce === 0}
              >
                Stop Clip
              </button>
              <button
                className="btn"
                style={{ background: '#1a4a1a', borderColor: '#4a9a4a', color: '#e8edf8', minWidth: '120px' }}
                onClick={() => {
                  onStartTimer?.()
                  setFjTimerPending(true)
                  setFjTimerSoundNonce((n) => n + 1)
                  // Delay timer start slightly so audio has time to buffer
                  setTimeout(() => {
                    setFjTimerSeconds(30)
                    setFjTimerPending(false)
                  }, 1500)
                }}
                disabled={fjTimerPending || (fjTimerSeconds !== null && fjTimerSeconds > 0)}
              >
                {fjTimerSeconds === null ? 'Start Timer' : fjTimerSeconds > 0 ? `${fjTimerSeconds}s` : "Time's up!"}
              </button>
              <button className="btn btn-outline" onClick={onEndFinalJeopardy}>
                End Final Jeopardy
              </button>
            </div>

            {fjTimerSoundNonce > 0 && (
              <iframe
                key={fjTimerSoundNonce}
                src="https://www.youtube.com/embed/F42y5PgxhZs?autoplay=1"
                width="1"
                height="1"
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                allow="autoplay"
                title="Final Jeopardy timer music"
              />
            )}

            {fjPlayNonce > 0 && fjEmbedUrl && (
              <div className="clip-player" style={{ marginBottom: '12px' }}>
                <iframe
                  key={fjPlayNonce}
                  src={fjEmbedUrl}
                  title="Final Jeopardy music"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            <div className="fj-wager-list">
              {activePlayers.map((name, idx) => {
                const teamId = `team_${idx}`
                const wagerAmt = finalJeopardyWagers?.[teamId] ?? null
                const answer = finalJeopardyAnswers?.[teamId] ?? null
                return (
                  <div key={name} className="score-pill" style={{ minWidth: '160px' }}>
                    <div className="score-name">{name}</div>
                    <div className="score-value">${(scores[name] || 0).toLocaleString()}</div>
                    <div className="small-meta" style={{ marginTop: '4px' }}>
                      Wager: {wagerAmt != null ? `$${wagerAmt.toLocaleString()}` : 'pending…'}
                    </div>
                    {answer != null && (
                      <div className="small-meta" style={{ marginTop: '4px', fontStyle: 'italic', wordBreak: 'break-word' }}>
                        "{answer || '(blank)'}"
                      </div>
                    )}
                    {answer == null && finalJeopardyState === 'clue' && (
                      <div className="small-meta" style={{ marginTop: '4px', opacity: 0.5 }}>
                        answering…
                      </div>
                    )}
                    {wagerAmt != null && (
                      <div className="mini-actions">
                        <button onClick={() => onUpdateScore(name, wagerAmt)}>
                          +${wagerAmt.toLocaleString()}
                        </button>
                        <button onClick={() => onUpdateScore(name, -wagerAmt)}>
                          -${wagerAmt.toLocaleString()}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default HostView