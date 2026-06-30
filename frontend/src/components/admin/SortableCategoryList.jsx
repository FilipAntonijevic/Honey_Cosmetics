import { useRef, useState } from 'react'
import ApiImage from '../ApiImage'

const ROW_GAP = 8

export default function SortableCategoryList({
  items,
  disabled = false,
  onReorder,
  getCount,
  onAssign,
  onEdit,
  onDelete,
}) {
  const [drag, setDrag] = useState(null)
  const itemRefs = useRef(new Map())

  const setItemRef = (id) => (el) => {
    if (el) itemRefs.current.set(id, el)
    else itemRefs.current.delete(id)
  }

  const measureStride = (index) => {
    const el = itemRefs.current.get(items[index].id)
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const neighbor = items[index + 1] ?? items[index - 1]
    if (neighbor) {
      const nrect = itemRefs.current.get(neighbor.id)?.getBoundingClientRect()
      if (nrect) {
        const stride = Math.abs(nrect.top - rect.top)
        if (stride > 0) return stride
      }
    }
    return rect.height + ROW_GAP
  }

  const onPointerDown = (e, index) => {
    if (disabled) return
    if (e.button != null && e.button !== 0) return
    if (e.target.closest('button, a, input, select, textarea, label')) return
    const el = itemRefs.current.get(items[index].id)
    if (!el) return
    el.setPointerCapture?.(e.pointerId)
    setDrag({
      id: items[index].id,
      pointerId: e.pointerId,
      startIndex: index,
      targetIndex: index,
      startY: e.clientY,
      offset: 0,
      stride: measureStride(index),
    })
  }

  const onPointerMove = (e) => {
    if (!drag) return
    const offset = e.clientY - drag.startY
    const stride = drag.stride || 1
    let targetIndex = drag.startIndex + Math.round(offset / stride)
    targetIndex = Math.max(0, Math.min(items.length - 1, targetIndex))
    if (offset !== drag.offset || targetIndex !== drag.targetIndex) {
      setDrag((d) => (d ? { ...d, offset, targetIndex } : d))
    }
  }

  const finishDrag = () => {
    if (!drag) return
    const { startIndex, targetIndex } = drag
    setDrag(null)
    if (targetIndex !== startIndex) {
      const next = items.slice()
      const [moved] = next.splice(startIndex, 1)
      next.splice(targetIndex, 0, moved)
      onReorder(next)
    }
  }

  const moveItem = (index, delta) => {
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= items.length) return
    const next = items.slice()
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    onReorder(next)
  }

  const styleFor = (index) => {
    if (!drag) return undefined
    const { startIndex, targetIndex, stride, offset } = drag
    if (index === startIndex) {
      return { transform: `translateY(${offset}px)`, zIndex: 20 }
    }
    if (targetIndex > startIndex && index > startIndex && index <= targetIndex) {
      return { transform: `translateY(${-stride}px)` }
    }
    if (targetIndex < startIndex && index >= targetIndex && index < startIndex) {
      return { transform: `translateY(${stride}px)` }
    }
    return { transform: 'translateY(0px)' }
  }

  return (
    <ul className={`adm-cat-sort-list${drag ? ' is-dragging' : ''}`}>
      {items.map((row, index) => (
        <li
          key={row.id}
          ref={setItemRef(row.id)}
          className={`adm-cat-sort-item${drag?.startIndex === index ? ' is-dragging' : ''}`}
          style={styleFor(index)}
          onPointerDown={(e) => onPointerDown(e, index)}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <span className="adm-cat-sort-handle" aria-hidden="true" title="Prevuci red za promenu redosleda">
            ⠿
          </span>
          <span className="adm-cat-sort-pos">{index + 1}.</span>
          {row.imageUrl ? (
            <ApiImage src={row.imageUrl} alt="" className="adm-best-thumb" draggable={false} />
          ) : (
            <div className="adm-best-thumb adm-best-thumb-empty" />
          )}
          <div className="adm-best-meta">
            <div className="adm-best-name">{row.name}</div>
            <div className="adm-best-sub">{getCount(row)} artikala</div>
          </div>
          <div className="adm-cat-sort-reorder">
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={() => moveItem(index, -1)}
              disabled={index === 0 || disabled}
              aria-label={`Pomeri ${row.name} gore`}
              title="Pomeri gore"
            >
              ↑
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={() => moveItem(index, 1)}
              disabled={index === items.length - 1 || disabled}
              aria-label={`Pomeri ${row.name} dole`}
              title="Pomeri dole"
            >
              ↓
            </button>
          </div>
          <div className="adm-table-actions adm-cat-sort-actions">
            <button type="button" className="adm-btn adm-btn-sm adm-btn-primary" onClick={() => onAssign(row)}>
              Ubaci artikle
            </button>
            <button type="button" className="adm-btn adm-btn-sm" onClick={() => onEdit(row)}>Izmeni</button>
            <button type="button" className="adm-btn adm-btn-sm adm-btn-danger" onClick={() => onDelete(row)}>Obriši</button>
          </div>
        </li>
      ))}
    </ul>
  )
}
