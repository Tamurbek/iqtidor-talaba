import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type { AdminSupervisorRequest, AdminSupervisorRequestListResponse } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import Pagination from '../common/Pagination'
import type { ShowToast } from './AdminToasts'

const PAGE_SIZE = 15

const cardStyle: React.CSSProperties = { background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 18 }

const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: 'Javob kutilmoqda', color: 'var(--badge-warning-text)', bg: 'var(--badge-warning-bg)' },
  accepted: { text: 'Qabul qilindi', color: 'var(--badge-success-text)', bg: 'var(--badge-success-bg)' },
  rejected: { text: 'Rad etildi', color: 'var(--badge-danger-text)', bg: 'var(--badge-danger-bg)' },
  cancelled: { text: 'Bekor qilindi', color: 'var(--text-muted)', bg: 'var(--bg-light)' },
}

interface Props {
  showToast: ShowToast
}

export default function AllSupervisorRequestsCard({ showToast }: Props) {
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminSupervisorRequestListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<number | null>(null)

  const load = useCallback(() => {
    setError(null)
    client
      .get<AdminSupervisorRequestListResponse>('/supervisor-requests/all', { params: { status, page, page_size: PAGE_SIZE } })
      .then(({ data }) => setData(data))
      .catch((err) => setError(extractErrorMessage(err, "So'rovlarni yuklashda xatolik yuz berdi")))
  }, [status, page])

  useEffect(() => {
    load()
  }, [load])

  const handleAssign = async (r: AdminSupervisorRequest) => {
    if (!window.confirm(`${r.student_name} ga ${r.supervisor_name} ilmiy rahbar sifatida biriktirilsinmi?`)) return
    setAssigningId(r.id)
    try {
      const { data } = await client.post<{ message?: string }>(`/users/${r.student_id}/assign-supervisor`, {
        supervisor_id: r.supervisor_id,
        research_topic: r.research_topic || '',
      })
      showToast(data.message || 'Ilmiy rahbar biriktirildi', 'success')
      load()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Ilmiy rahbarni biriktirishda xatolik yuz berdi'), 'error')
    } finally {
      setAssigningId(null)
    }
  }

  const items = data?.items ?? []

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-heading)' }}>Talabalarning ilmiy rahbarlik so'rovlari</h3>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Talabalar o'qituvchilarga yuborgan barcha so'rovlar</p>
        </div>
        <select
          aria-label="Holat bo'yicha filtr"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, background: 'var(--bg-white)' }}
        >
          <option value="pending">Javob kutilmoqda</option>
          <option value="accepted">Qabul qilingan</option>
          <option value="rejected">Rad etilgan</option>
          <option value="cancelled">Bekor qilingan</option>
          <option value="all">Barchasi</option>
        </select>
      </div>

      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
      )}
      {!data && !error && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Yuklanmoqda...</div>}
      {data && items.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 24 }}>So'rovlar mavjud emas</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((r) => {
          const st = statusLabel[r.status] || { text: r.status, color: 'var(--text-secondary)', bg: 'var(--bg-light)' }
          return (
            <div key={r.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>{r.student_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[r.faculty, r.group_name].filter(Boolean).join(' · ')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Rahbar: <strong>{r.supervisor_name}</strong>
                  {r.supervisor_department && <span style={{ color: 'var(--text-muted)' }}> ({r.supervisor_department})</span>}
                </div>
                {r.research_topic && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>Mavzu: {r.research_topic}</div>}
                {r.status === 'rejected' && r.rejection_reason && (
                  <div style={{ fontSize: 12, color: 'var(--badge-danger-text)', marginTop: 2 }}>Sabab: {r.rejection_reason}</div>
                )}
                <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>{new Date(r.requested_at).toLocaleDateString('uz-UZ')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 999 }}>{st.text}</span>
                {r.status === 'pending' && !r.student_has_supervisor && (
                  <button
                    type="button"
                    disabled={assigningId === r.id}
                    onClick={() => handleAssign(r)}
                    style={{ padding: '7px 14px', border: 'none', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {assigningId === r.id ? 'Biriktirilmoqda...' : 'Biriktirish'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {data && data.total > 0 && (
        <Pagination page={page} totalPages={data.total_pages} total={data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  )
}
