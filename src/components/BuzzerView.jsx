import { useEffect, useRef, useState } from 'react'

function BuzzerView({
  players,
  connectedPlayerId,
  buzzers,
  finalJeopardy,
  finalJeopardyState,
  finalJeopardyWagers,
  finalJeopardyAnswersLocked,
  finalJeopardyTimerStarted,
  onBuzzIn,
  onSubmitFinalWager,
  onSubmitFinalAnswer,
  onDisconnect,
}) {
  useEffect(() => {
    if (!navigator.wakeLock) return
    let wakeLock = null
    navigator.wakeLock.request('screen').then((lock) => { wakeLock = lock }).catch(() => {})
    return () => { wakeLock?.release() }
  }, [])

  const [wagerInput, setWagerInput] = useState('')
  const [wagerSubmitted, setWagerSubmitted] = useState(false)
  const [answerInput, setAnswerInput] = useState('')
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const answerInputRef = useRef('')
  const answerSubmittedRef = useRef(false)

  useEffect(() => {
    setWagerInput('')
    setWagerSubmitted(false)
    setAnswerInput('')
    answerInputRef.current = ''
    setAnswerSubmitted(false)
    answerSubmittedRef.current = false
  }, [finalJeopardyState])

  // Keep ref in sync with state so auto-submit always captures the latest text
  useEffect(() => {
    answerInputRef.current = answerInput
  }, [answerInput])

  // Auto-submit answer when host locks answers
  useEffect(() => {
    if (!finalJeopardyAnswersLocked) return
    if (answerSubmittedRef.current) return
    answerSubmittedRef.current = true
    setAnswerSubmitted(true)
    onSubmitFinalAnswer(connectedPlayerId, answerInputRef.current)
  }, [finalJeopardyAnswersLocked]) // eslint-disable-line react-hooks/exhaustive-deps

  const playerBuzzer = buzzers[connectedPlayerId]
  if (!playerBuzzer) {
    return <div>Loading...</div>
  }

  const teamName = players[playerBuzzer.teamIndex] || `Team ${playerBuzzer.teamIndex + 1}`
  const myWager = finalJeopardyWagers?.[connectedPlayerId]

  if (finalJeopardyState === 'wagering') {
    const alreadySubmitted = wagerSubmitted || myWager != null
    return (
      <div className="page buzzer-page">
        <div className="topbar">
          <div style={{ width: '60px' }} />
          <h2>Final Jeopardy</h2>
          <button className="btn btn-outline" onClick={onDisconnect}>Leave</button>
        </div>
        <div className="buzzer-container">
          <div className="team-display">{teamName}</div>
          <div className="final-jeopardy-category">{finalJeopardy?.category || 'Final Jeopardy'}</div>
          {alreadySubmitted ? (
            <div className="fj-wager-submitted">
              Wager locked in: <strong>${(myWager ?? Number(wagerInput) ?? 0).toLocaleString()}</strong>
            </div>
          ) : (
            <div className="fj-wager-form">
              <div className="small-meta" style={{ marginBottom: '10px' }}>Enter your wager</div>
              <input
                type="number"
                className="fj-wager-input"
                min={0}
                value={wagerInput}
                onChange={(e) => setWagerInput(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <button
                className="btn btn-gold"
                style={{ marginTop: '14px', width: '100%', minHeight: '56px', fontSize: '18px' }}
                onClick={() => {
                  onSubmitFinalWager(connectedPlayerId, wagerInput)
                  setWagerSubmitted(true)
                }}
                disabled={wagerInput === ''}
              >
                Lock In Wager
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (finalJeopardyState === 'clue') {
    return (
      <div className="page buzzer-page">
        <div className="topbar">
          <div style={{ width: '60px' }} />
          <h2>Final Jeopardy</h2>
          <button className="btn btn-outline" onClick={onDisconnect}>Leave</button>
        </div>
        <div className="buzzer-container">
          <div className="team-display">{teamName}</div>
          <div className="small-meta" style={{ marginBottom: '16px' }}>
            Wager: <strong>${(myWager ?? 0).toLocaleString()}</strong>
          </div>
          {!finalJeopardyTimerStarted ? (
            <div className="small-meta" style={{ opacity: 0.6 }}>Waiting for host to start timer…</div>
          ) : (answerSubmitted || finalJeopardyAnswersLocked) ? (
            <div className="fj-wager-submitted">
              Answer submitted: <strong>{answerInput || '(no answer)'}</strong>
            </div>
          ) : (
            <div className="fj-wager-form">
              <div className="small-meta" style={{ marginBottom: '10px' }}>Type your answer</div>
              <textarea
                className="fj-answer-input"
                rows={3}
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="What is..."
                autoFocus
              />
              <button
                className="btn btn-gold"
                style={{ marginTop: '14px', width: '100%', minHeight: '56px', fontSize: '18px' }}
                onClick={() => {
                  answerSubmittedRef.current = true
                  setAnswerSubmitted(true)
                  onSubmitFinalAnswer(connectedPlayerId, answerInput)
                }}
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (finalJeopardyState === 'revealed') {
    return (
      <div className="page buzzer-page">
        <div className="topbar">
          <div style={{ width: '60px' }} />
          <h2>Final Jeopardy</h2>
          <button className="btn btn-outline" onClick={onDisconnect}>Leave</button>
        </div>
        <div className="buzzer-container">
          <div className="team-display">{teamName}</div>
          <div className="small-meta">
            Wager: <strong>${(myWager ?? 0).toLocaleString()}</strong>
          </div>
          <div className="reveal-box" style={{ maxWidth: '380px', textAlign: 'center' }}>
            {finalJeopardy?.question}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page buzzer-page">
      <div className="topbar">
        <div style={{ width: '60px' }} />
        <h2>Buzzer</h2>
        <button className="btn btn-outline" onClick={onDisconnect}>
          Leave
        </button>
      </div>

      <div className="buzzer-container">
        <div className="team-display">{teamName}</div>

        {playerBuzzer.buzzedIn ? (
          <div className="buzzed-in-message">
            <div className="small-meta">You buzzed in!</div>
            <div className="buzzer-btn buzzer-disabled">
              Waiting for host...
            </div>
          </div>
        ) : (
          <button
            className="btn buzzer-btn"
            onClick={onBuzzIn}
          >
            BUZZ IN
          </button>
        )}
      </div>
    </div>
  )
}

export default BuzzerView
