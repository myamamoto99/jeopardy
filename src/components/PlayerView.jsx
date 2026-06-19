import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import BoardGrid from './BoardGrid'
import ScoreRow from './ScoreRow'
import { POINT_VALUES } from '../data/gameData'

function PlayerView({
  categories,
  activeClue,
  hostClueState,
  activePlayers,
  scores,
  boardReady,
  finalJeopardy,
  finalJeopardyState,
  onHome,
  onHost,
}) {
  const [buzzerUrl, setBuzzerUrl] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    setBuzzerUrl(
      `${window.location.origin}${window.location.pathname.replace(/\/player$/, '')}/buzzer?join=1`,
    )
  }, [])

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

      {finalJeopardyState === 'wagering' ? (
        <div className="clue-view">
          <div className="small-meta">Final Jeopardy</div>
          <div className="daily-double-title" style={{ color: '#e8edf8' }}>
            {finalJeopardy?.category || 'Final Jeopardy'}
          </div>
          <div className="subcopy">Place your wagers on your buzzer device</div>
          <ScoreRow players={activePlayers} scores={scores} />
        </div>
      ) : finalJeopardyState === 'clue' ? (
        <div className="clue-view">
          <div className="small-meta">Final Jeopardy · {finalJeopardy?.category}</div>
          <div className="clue-answer">{finalJeopardy?.clue}</div>
          {finalJeopardy?.imageUrl && (
            <img src={finalJeopardy.imageUrl} alt="Final Jeopardy" className="clue-image" />
          )}
          <div className="subcopy" style={{ marginTop: '16px' }}>Write your answer on your buzzer device</div>
          <ScoreRow players={activePlayers} scores={scores} />
        </div>
      ) : finalJeopardyState === 'revealed' ? (
        <div className="clue-view">
          <div className="small-meta">Final Jeopardy · {finalJeopardy?.category}</div>
          <div className="clue-answer">{finalJeopardy?.clue}</div>
          {finalJeopardy?.imageUrl && (
            <img src={finalJeopardy.imageUrl} alt="Final Jeopardy" className="clue-image" />
          )}
          <div className="reveal-box">{finalJeopardy?.question}</div>
        </div>
      ) : !boardReady ? (
        <div className="player-main">
          <div className="title player-title">JEOPARDY!</div>
          <div className="subcopy">Scan to join the game</div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            {buzzerUrl ? (
              <QRCodeCanvas value={buzzerUrl} size={256} level="H" includeMargin={true} />
            ) : (
              <div className="small-meta">Preparing join code...</div>
            )}
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

          {buzzerUrl && (
            <div className="join-panel">
              <div className="small-meta">Need to join buzzer on another device?</div>
              <div className="join-panel-qr">
                <QRCodeCanvas value={buzzerUrl} size={120} level="H" includeMargin={true} />
              </div>
            </div>
          )}
        </>
      ) : hostClueState === 'daily-double' ? (
        <div className="clue-view">
          <div className="small-meta">{categories[activeClue.ci].name}</div>
          <div className="daily-double-title">DAILY DOUBLE!</div>
        </div>
      ) : (
        <div className="clue-view">
          <div className="small-meta">
            {categories[activeClue.ci].name} · ${POINT_VALUES[activeClue.vi]}
          </div>
          <div className="clue-answer">{categories[activeClue.ci].clues[activeClue.vi].answer}</div>
          {categories[activeClue.ci].clues[activeClue.vi].imageUrl && (
            <img
              src={categories[activeClue.ci].clues[activeClue.vi].imageUrl}
              alt="Clue image"
              className="clue-image"
            />
          )}
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