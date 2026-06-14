import ScoreRow from './ScoreRow'
import { POINT_VALUES } from '../data/gameData'

function PlayerView({
  categories,
  activeClue,
  hostClueState,
  activePlayers,
  scores,
  onHome,
  onHost,
}) {
  return (
    <div className="player-layout">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <div className="small-meta">Player Screen</div>
        <button className="btn btn-outline" onClick={onHost}>
          Host
        </button>
      </div>
      <div className="player-main">
        {!activeClue ? (
          <>
            <div className="title player-title">JEOPARDY!</div>
            <div className="subcopy">Waiting for the host to select a clue...</div>
          </>
        ) : (
          <>
            <div className="small-meta">
              {categories[activeClue.ci].name} · ${POINT_VALUES[activeClue.vi]}
            </div>
            <div className="clue-answer">{categories[activeClue.ci].clues[activeClue.vi].answer}</div>
            {hostClueState === 'revealed' && (
              <div className="reveal-box">
                {categories[activeClue.ci].clues[activeClue.vi].question}
              </div>
            )}
          </>
        )}
      </div>
      <ScoreRow
        players={activePlayers}
        scores={scores}
        compact
        keyPrefix="ps"
        className="player-scores"
      />
    </div>
  )
}

export default PlayerView