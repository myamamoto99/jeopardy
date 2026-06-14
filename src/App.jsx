import './App.css'
import BoardView from './components/BoardView'
import EditorView from './components/EditorView'
import HomeView from './components/HomeView'
import HostView from './components/HostView'
import PlayersView from './components/PlayersView'
import PlayerView from './components/PlayerView'
import useJeopardyGame from './hooks/useJeopardyGame'

function App() {
  const {
    state: {
      view,
      categories,
      scores,
      players,
      activeClue,
      hostClueState,
      editingCat,
      hostSelection,
      homeBoardReveal,
    },
    derived: { activePlayers, editorSaved, playersSaved },
    actions: {
      setView,
      setEditingCat,
      setHomeBoardReveal,
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
    },
  } = useJeopardyGame()

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
          categories={categories}
          hostSelection={hostSelection}
          activePlayers={activePlayers}
          scores={scores}
          onHome={() => setView('home')}
          onSelectClue={openHostSelection}
          onSendToPlayer={() => sendSelectionToPlayer(false)}
          onRevealOnPlayer={() => sendSelectionToPlayer(true)}
          onMarkUsed={() => markClueUsed(hostSelection.ci, hostSelection.vi, true)}
          onResetUnused={() => markClueUsed(hostSelection.ci, hostSelection.vi, false)}
          onUpdateScore={updateScore}
        />
      )}

      {view === 'player' && (
        <PlayerView
          categories={categories}
          activeClue={activeClue}
          hostClueState={hostClueState}
          activePlayers={activePlayers}
          scores={scores}
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
    </div>
  )
}

export default App
