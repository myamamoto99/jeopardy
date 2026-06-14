import { POINT_VALUES } from '../data/gameData'

function BoardGrid({ categories, onClueClick, getCellProps, compact = false }) {
  const gridClass = compact ? 'board-grid compact' : 'board-grid'
  const categoryClass = compact ? 'cat-cell compact' : 'cat-cell'

  return (
    <div
      className={gridClass}
      style={{
        gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
      }}
    >
      {categories.map((cat) => (
        <div key={cat.name} className={categoryClass}>
          {cat.name}
        </div>
      ))}
      {POINT_VALUES.flatMap((pts, vi) =>
        categories.map((cat, ci) => {
          const clue = cat.clues[vi]
          const cellProps = getCellProps
            ? getCellProps({ clue, ci, vi, pts, compact })
            : {
                className: `clue-cell ${clue.used ? 'used' : ''}`,
                disabled: clue.used,
                label: clue.used ? '' : `$${pts}`,
              }
          return (
            <button
              key={`${compact ? 'h' : 'b'}-${ci}-${vi}`}
              className={cellProps.className}
              onClick={() => onClueClick(ci, vi)}
              disabled={cellProps.disabled}
            >
              {cellProps.label}
            </button>
          )
        }),
      )}
    </div>
  )
}

export default BoardGrid