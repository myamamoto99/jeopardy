function PlayersView({ players, scores, onHome, onSetPlayerName, onAddPlayer, onRemovePlayer, onSavePlayers, onResetScores, playersSaved }) {
  return (
    <div className="page panel-page">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <h2>Manage Players</h2>
        <div />
      </div>
      {players.map((name, idx) => (
        <div className="player-row" key={`player-input-${idx}`}>
          <div className="player-label">Player {idx + 1}</div>
          <input
            value={name}
            onChange={(e) => onSetPlayerName(idx, e.target.value)}
            placeholder="Name or team"
          />
          <div className="score-value">${(scores[name] || 0).toLocaleString()}</div>
          <button
            className="btn btn-outline"
            onClick={() => onRemovePlayer(idx)}
            disabled={players.length <= 1}
          >
            ✕
          </button>
        </div>
      ))}

      {players.length < 8 && (
        <button className="btn btn-outline" style={{ marginTop: '10px', width: '100%' }} onClick={onAddPlayer}>
          + Add Player
        </button>
      )}

      <div className="action-row">
        <button className="btn btn-gold" onClick={onSavePlayers}>
          Save Players
        </button>
        <button className="btn btn-outline" onClick={onResetScores}>
          Reset Scores
        </button>
      </div>

      {playersSaved && <div className="saved">Changes saved!</div>}
    </div>
  )
}

export default PlayersView