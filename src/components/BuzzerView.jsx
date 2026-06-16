import { useEffect } from 'react'

function BuzzerView({ players, connectedPlayerId, buzzers, onBuzzIn, onDisconnect }) {
  useEffect(() => {
    if (!navigator.wakeLock) return
    let wakeLock = null
    navigator.wakeLock.request('screen').then((lock) => { wakeLock = lock }).catch(() => {})
    return () => { wakeLock?.release() }
  }, [])
  const playerBuzzer = buzzers[connectedPlayerId]
  if (!playerBuzzer) {
    return <div>Loading...</div>
  }

  const teamName = players[playerBuzzer.teamIndex] || `Team ${playerBuzzer.teamIndex + 1}`

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
