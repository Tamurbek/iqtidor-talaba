import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface SyncRun {
  id: number
  status: 'running' | 'success' | 'failed'
  students_created: number
  students_updated: number
  employees_synced: number
  error: string | null
  finished_at: string | null
}

interface SyncStatus {
  running: boolean
  students_total: number
  employees_total: number
  runs: SyncRun[]
}

interface Props {
  showToast: ShowToast
  onFinished: () => void
}

export default function HemisSyncButton({ showToast, onFinished }: Props) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await client.get<SyncStatus>('/hemis-sync/status')
      setStatus(data)
      return data
    } catch {
      setStatus(null)
      return null
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!status?.running) return
    const timer = window.setInterval(async () => {
      const next = await load()
      if (next && !next.running) {
        const last = next.runs[0]
        if (last?.status === 'success') {
          showToast(`HEMIS: ${last.students_created} ta yangi talaba, ${last.employees_synced} ta o'qituvchi`, 'success')
          onFinished()
        } else if (last?.status === 'failed') {
          showToast(last.error || 'HEMIS sinxronlash muvaffaqiyatsiz', 'error')
        }
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [status?.running, load, onFinished, showToast])

  if (!status) return null

  const start = async () => {
    setStarting(true)
    try {
      await client.post('/hemis-sync/run')
      await load()
    } catch (err) {
      showToast(extractErrorMessage(err, "HEMIS sinxronlashni boshlab bo'lmadi"), 'error')
    } finally {
      setStarting(false)
    }
  }

  const last = status.runs[0]
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {last?.status === 'failed' && !status.running && (
        <span title={last.error ?? ''} style={{ color: 'var(--badge-danger-text)', fontSize: 12.5, fontWeight: 600 }}>
          Oxirgi sinxronlash xato
        </span>
      )}
      <button
        type="button"
        onClick={start}
        disabled={starting || status.running}
        style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, border: '1px solid var(--border-color)', background: 'var(--bg-white)', color: 'var(--text-heading)', cursor: starting || status.running ? 'wait' : 'pointer' }}
      >
        {status.running ? 'HEMIS sinxronlanmoqda...' : "HEMIS'dan talaba va o'qituvchilarni yuklash"}
      </button>
    </div>
  )
}
