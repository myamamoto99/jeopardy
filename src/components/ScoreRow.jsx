function ScoreRow({ players, scores, compact = false, keyPrefix = 'score', className = '' }) {
  return (
    <div className={`score-row ${className}`.trim()}>
      {players.map((name) => (
        <div key={`${keyPrefix}-${name}`} className={`score-pill ${compact ? 'compact' : ''}`}>
          <div className="score-name">{name}</div>
          <div className="score-value">${(scores[name] || 0).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}

export default ScoreRow