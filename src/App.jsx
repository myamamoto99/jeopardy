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
      roomCode,
      isRemoteSyncEnabled,
      categories,
      scores,
      players,
      activeClue,
      hostClueState,
      editingCat,
      hostSelection,
      homeBoardReveal,
      boardReady,
      connectedPlayerId,
      buzzers,
    },
    derived: { activePlayers, editorSaved, playersSaved },
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
      saveEditorChanges,
      savePlayers,
      openHostSelection,
      sendSelectionToPlayer,
      resetCategoriesToDefault,
      resetScores,
      regenerateRoomCode,
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
          onHome={() => setView('home')}
          onShowClue={showClue}
          onReveal={() => setHomeBoardReveal(true)}
          onMarkUsedAndReturn={markActiveClueUsedAndReturn}
          onBack={closeBoardClue}
        />
      )}

      {view === 'host' && (
        <HostView
          roomCode={roomCode}
          isRemoteSyncEnabled={isRemoteSyncEnabled}
          categories={categories}
          hostSelection={hostSelection}
          activePlayers={activePlayers}
          scores={scores}
          players={players}
          buzzers={buzzers}
          boardReady={boardReady}
          onHome={() => setView('home')}
          onSelectClue={openHostSelection}
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
          onRegenerateRoomCode={regenerateRoomCode}
          onRevealBoard={() => setBoardReady(true)}
        />
      )}

      {view === 'player' && (
        <PlayerView
          roomCode={roomCode}
          categories={categories}
          activeClue={activeClue}
          hostClueState={hostClueState}
          activePlayers={activePlayers}
          scores={scores}
          boardReady={boardReady}
          onHome={() => setView('home')}
          onHost={() => setView('host')}
        />
      )}

      {view === 'editor' && (
        <EditorView
          categories={categories}
          editingCat={editingCat}
          setEditingCat={setEditingCat}
          onHome={() => setView('home')}
          onSave={saveEditorChanges}
          onReset={() => {
            if (window.confirm('Reset ALL questions to default sample content?')) {
              resetCategoriesToDefault()
            }
          }}
          showSaved={editorSaved}
        />
      )}

      {view === 'players' && (
        <PlayersView
          players={players}
          scores={scores}
          onHome={() => setView('home')}
          onSetPlayerName={setPlayerName}
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
          onBuzzIn={buzzIn}
          onDisconnect={disconnectPlayer}
        />
      )}
    </div>
  )
}

export default App
