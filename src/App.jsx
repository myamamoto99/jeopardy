import './App.css'
import { useEffect } from 'react'
import BoardView from './components/BoardView'
import EditorView from './components/EditorView'
import HomeView from './components/HomeView'
import HostView from './components/HostView'
import PlayersView from './components/PlayersView'
import PlayerView from './components/PlayerView'
import PlayerSelectView from './components/PlayerSelectView'
import BuzzerView from './components/BuzzerView'
import useJeopardyGame from './hooks/useJeopardyGame'

function App({ initialView }) {
  const {
    state: {
      view,
      isRemoteSyncEnabled,
      firebaseStatus,
      boardCatalog,
      activeBoardId,
      editorBoardId,
      categories,
      scores,
      players,
      activeClue,
      hostClueState,
      editingCat,
      hostSelection,
      homeBoardReveal,
      boardReady,
      dailyDoublePositions,
      finalJeopardyState,
      finalJeopardyWagers,
      connectedPlayerId,
      buzzers,
    },
    derived: { activePlayers, editorCategories, editorFinalJeopardy, finalJeopardy, editorSaved, playersSaved },
    actions: {
      setView,
      setEditingCat,
      setHomeBoardReveal,
      setBoardReady,
      showClue,
      closeBoardClue,
      markClueUsed,
      markActiveClueUsedAndReturn,
      updateScore,
      setPlayerName,
      addPlayer,
      removePlayer,
      saveEditorChanges,
      saveFinalJeopardy,
      savePlayers,
      openHostSelection,
      sendSelectionToPlayer,
      showDailyDoubleOnPlayer,
      startFinalJeopardy,
      revealFinalClue,
      revealFinalAnswer,
      endFinalJeopardy,
      submitFinalWager,
      resetScores,
      clearRealtimeGameData,
      selectBoard,
      selectGameBoard,
      addBoard,
      renameBoard,
      connectPlayer,
      buzzIn,
      resetBuzzer,
      resetAllBuzzers,
      disconnectPlayer,
    },
  } = useJeopardyGame()

  // Auto-navigate to buzzer mode if accessed via buzzer URL
  useEffect(() => {
    if (initialView) {
      setView(initialView)
    } else {
      const params = new URLSearchParams(window.location.search)
      if (params.get('join') === '1') {
        setView('player-select')
      }
    }
  }, [initialView, setView])

  return (
    <div className="shell">
      {view === 'home' && <HomeView onNavigate={setView} />}

      {view === 'board' && (
        <BoardView
          categories={categories}
          activePlayers={activePlayers}
          scores={scores}
          activeClue={activeClue}
          homeBoardReveal={homeBoardReveal}
          dailyDoublePositions={dailyDoublePositions}
          onHome={() => setView('home')}
          onShowClue={showClue}
          onReveal={() => setHomeBoardReveal(true)}
          onMarkUsedAndReturn={markActiveClueUsedAndReturn}
          onBack={closeBoardClue}
        />
      )}

      {view === 'host' && (
        <HostView
          isRemoteSyncEnabled={isRemoteSyncEnabled}
          firebaseStatus={firebaseStatus}
          boardCatalog={boardCatalog}
          activeBoardId={activeBoardId}
          onSelectGameBoard={selectGameBoard}
          categories={categories}
          hostSelection={hostSelection}
          activePlayers={activePlayers}
          scores={scores}
          players={players}
          buzzers={buzzers}
          boardReady={boardReady}
          dailyDoublePositions={dailyDoublePositions}
          finalJeopardy={finalJeopardy}
          finalJeopardyState={finalJeopardyState}
          finalJeopardyWagers={finalJeopardyWagers}
          onHome={() => setView('home')}
          onSelectClue={openHostSelection}
          onShowDailyDouble={showDailyDoubleOnPlayer}
          onSendToPlayer={() => sendSelectionToPlayer(false)}
          onRevealOnPlayer={() => sendSelectionToPlayer(true)}
          onMarkUsed={() => {
            if (hostSelection) {
              markClueUsed(hostSelection.ci, hostSelection.vi, true)
              closeBoardClue()
            }
          }}
          onResetUnused={() => markClueUsed(hostSelection.ci, hostSelection.vi, false)}
          onUpdateScore={updateScore}
          onResetBuzzer={resetBuzzer}
          onResetAllBuzzers={resetAllBuzzers}
          onClearRealtimeData={clearRealtimeGameData}
          onShowJoinLobby={() => {
            closeBoardClue()
            setBoardReady(false)
          }}
          onRevealBoard={() => setBoardReady(true)}
          onStartFinalJeopardy={startFinalJeopardy}
          onRevealFinalClue={revealFinalClue}
          onRevealFinalAnswer={revealFinalAnswer}
          onEndFinalJeopardy={endFinalJeopardy}
        />
      )}

      {view === 'player' && (
        <PlayerView
          categories={categories}
          activeClue={activeClue}
          hostClueState={hostClueState}
          activePlayers={activePlayers}
          scores={scores}
          boardReady={boardReady}
          finalJeopardy={finalJeopardy}
          finalJeopardyState={finalJeopardyState}
          onHome={() => setView('home')}
          onHost={() => setView('host')}
        />
      )}

      {view === 'editor' && (
        <EditorView
          boardCatalog={boardCatalog}
          editorBoardId={editorBoardId}
          categories={editorCategories}
          finalJeopardy={editorFinalJeopardy}
          editingCat={editingCat}
          setEditingCat={setEditingCat}
          onSelectBoard={selectBoard}
          onAddBoard={addBoard}
          onRenameBoard={renameBoard}
          onHome={() => setView('home')}
          onSave={saveEditorChanges}
          onSaveFinalJeopardy={(data, opts) => saveFinalJeopardy(editorBoardId, data, opts)}
          showSaved={editorSaved}
        />
      )}

      {view === 'players' && (
        <PlayersView
          players={players}
          scores={scores}
          onHome={() => setView('home')}
          onSetPlayerName={setPlayerName}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onSavePlayers={savePlayers}
          onResetScores={() => {
            if (window.confirm('Reset all scores to $0?')) {
              resetScores()
            }
          }}
          playersSaved={playersSaved}
        />
      )}

      {view === 'player-select' && (
        <PlayerSelectView
          players={players}
          onSelectPlayer={connectPlayer}
          onHome={() => setView('home')}
        />
      )}

      {view === 'buzzer' && (
        <BuzzerView
          players={players}
          connectedPlayerId={connectedPlayerId}
          buzzers={buzzers}
          finalJeopardy={finalJeopardy}
          finalJeopardyState={finalJeopardyState}
          finalJeopardyWagers={finalJeopardyWagers}
          onBuzzIn={buzzIn}
          onSubmitFinalWager={submitFinalWager}
          onDisconnect={disconnectPlayer}
        />
      )}
    </div>
  )
}

export default App
