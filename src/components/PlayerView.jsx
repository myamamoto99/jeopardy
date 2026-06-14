import { QRCodeCanvas } from 'qrcode.react'
import BoardGrid from './BoardGrid'
import ScoreRow from './ScoreRow'
import { POINT_VALUES } from '../data/gameData'

function PlayerView({
  roomCode,
  categories,
  activeClue,
  hostClueState,
  activePlayers,
  scores,
  boardReady,
  onHome,
  onHost,
}) {
  const buzzerUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname.replace(/\/player$/, '')}/buzzer?room=${encodeURIComponent(roomCode || '')}`
    : ''

  return (
    <div className="page board-page">
      <div className="topbar">
        <button className="btn btn-outline" onClick={onHome}>
          Home
        </button>
        <h2>JEOPARDY!</h2>
        <button className="btn btn-outline" onClick={onHost}>
          Host
        </button>
      </div>

      {!boardReady ? (
        <div className="player-main">
          <div className="title player-title">JEOPARDY!</div>
          <div className="subcopy">Scan to join the game</div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <QRCodeCanvas value={buzzerUrl} size={256} level="H" includeMargin={true} />
          </div>
          <div className="subcopy">Waiting for host to reveal the board...</div>
        </div>
      ) : !activeClue ? (
        <>
          <BoardGrid
            categories={categories}
            onClueClick={() => {}}
            getCellProps={({ clue, pts, compact }) => ({
              className: `clue-cell ${compact ? 'compact' : ''} ${clue.used ? 'used' : ''}`,
              disabled: true,
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
          {hostClueState === 'revealed' && (
            <div className="reveal-box">
              {categories[activeClue.ci].clues[activeClue.vi].question}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PlayerView