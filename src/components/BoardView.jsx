import BoardGrid from './BoardGrid'
import ScoreRow from './ScoreRow'
import { POINT_VALUES } from '../data/gameData'

function BoardView({
  categories,
  activePlayers,
  scores,
  activeClue,
  homeBoardReveal,
  onHome,
  onShowClue,
  onReveal,
  onMarkUsedAndReturn,
  onBack,
}) {
  return (
    <div className="page board-page">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <h2>JEOPARDY!</h2>
        <div className="small-meta">{activePlayers.length} players</div>
      </div>

      {!activeClue ? (
        <>
          <BoardGrid
            categories={categories}
            onClueClick={onShowClue}
            getCellProps={({ clue, pts, compact }) => ({
              className: `clue-cell ${compact ? 'compact' : ''} ${clue.used ? 'used' : ''}`,
              disabled: clue.used,
              label: clue.used ? '' : `$${pts}`,
            })}
          />

          <ScoreRow players={activePlayers} scores={scores} />
        </>
      ) : (
        <div className="clue-view">
          <div className="small-meta">
            {categories[activeClue.ci].name} · ${POINT_VALUES[activeClue.vi]}
          </div>
          <div className="clue-answer">{categories[activeClue.ci].clues[activeClue.vi].answer}</div>
          <div className="subcopy">Phrase your response as a question!</div>
          {homeBoardReveal && (
            <div className="reveal-box">
              {categories[activeClue.ci].clues[activeClue.vi].question}
            </div>
          )}
          <div className="action-row">
            <button className="btn btn-blue" onClick={onReveal}>
              Reveal Correct Question
            </button>
            <button className="btn btn-gold" onClick={onMarkUsedAndReturn}>
              Mark Used & Return
            </button>
            <button className="btn btn-outline" onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BoardView