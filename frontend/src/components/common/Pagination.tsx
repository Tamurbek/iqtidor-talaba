interface Props {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, total, pageSize, onPageChange }: Props) {
  if (total === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Jami {total} ta yozuvdan {start}–{end} ko'rsatilmoqda
      </span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', color: 'var(--text-table-header)', padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
        >
          Oldingi
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--text-table-header)', fontWeight: 600, padding: '0 6px' }}>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', color: 'var(--text-table-header)', padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
        >
          Keyingi
        </button>
      </div>
    </div>
  )
}
