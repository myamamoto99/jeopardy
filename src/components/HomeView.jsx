function HomeView({ onNavigate }) {
  return (
    <div className="page home-page">
      <div className="eyebrow">Welcome to</div>
      <h1 className="title">JEOPARDY!</h1>
      <p className="subcopy">
        Set up your game, then open the <strong>Host</strong> and <strong>Player</strong>{' '}
        views in separate tabs or windows.
      </p>
      <div className="home-actions">
        <button className="btn btn-gold" onClick={() => onNavigate('board')}>
          Game Board
        </button>
        <button className="btn btn-blue" onClick={() => onNavigate('host')}>
          Host View
        </button>
        <button className="btn btn-outline" onClick={() => onNavigate('player')}>
          Player Screen
        </button>
        <button className="btn btn-gold" onClick={() => onNavigate('player-select')}>
          Join Game (Buzzer)
        </button>
        <button className="btn btn-outline" onClick={() => onNavigate('editor')}>
          Edit Questions
        </button>
        <button className="btn btn-outline" onClick={() => onNavigate('players')}>
          Manage Players
        </button>
      </div>
      <div className="info-panel">
        <strong>How to use:</strong> Edit your questions first, add player names, then
        open Host View on your device and Player Screen on the shared display.
      </div>
    </div>
  )
}

export default HomeView