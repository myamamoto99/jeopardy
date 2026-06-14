function PlayerSelectView({ players, onSelectPlayer, onHome }) {
  return (
    <div className="page panel-page">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <h2>Join Game</h2>
        <div style={{ width: '60px' }} />
      </div>

      <div className="info-panel">
        Select which team you are on to join the game.
      </div>

      <div className="player-selection-grid">
        {players.map((name, idx) => (
          <button
            key={`player-select-${idx}`}
            className="btn btn-blue player-selection-btn"
            onClick={() => onSelectPlayer(idx)}
          >
            <div className="team-name">{name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PlayerSelectView
