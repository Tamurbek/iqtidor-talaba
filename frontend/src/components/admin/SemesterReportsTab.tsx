import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

export interface SemesterReport {
  id: number
  kind: 'individual' | 'faculty_summary' | string
  author_id: number
  author_role: string
  author_name?: string | null
  semester: string
  faculty?: string | null
  content: string
  stats_json?: Record<string, unknown> | null
  included_report_ids?: number[] | null
  created_at: string
  updated_at?: string | null
}

interface Props {
  /** ilmiy rahbar / tyutor: o'z hisobotini yuboradi */
  canAuthor: boolean
  /** fakultet koordinatori: fakultet hisobotlarini ko'radi va umumlashtiradi */
  isCoordinator: boolean
  /** mas'ul bo'lim: barcha hisobotlarni ko'radi */
  isDeptHead: boolean
  showToast: ShowToast
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 16,
  padding: 20,
}

const ROLE_LABEL: Record<string, string> = {
  supervisor: 'Ilmiy rahbar',
  tutor: 'Tyutor',
  faculty_coordinator: 'Fakultet (umumlashtirilgan)',
}

function semesterLabel(code: string): string {
  const [a, b, part] = code.split('-')
  return `${a}-${b} o'quv yili, ${part === '1' ? 'kuzgi' : 'bahorgi'} semestr`
}

function StatsLine({ stats }: { stats?: Record<string, unknown> | null }) {
  if (!stats) return null
  const parts: string[] = []
  const n = (k: string) => (typeof stats[k] === 'number' ? (stats[k] as number) : null)
  if (n('reports') != null) parts.push(`hisobotlar: ${n('reports')}`)
  if (n('students') != null) parts.push(`talabalar: ${n('students')}`)
  if (n('meetings') != null) parts.push(`uchrashuvlar: ${n('meetings')}`)
  if (n('approved_achievements') != null) parts.push(`tasdiqlangan yutuqlar: ${n('approved_achievements')}`)
  if (!parts.length) return null
  return <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{parts.join(' · ')}</div>
}

function ReportCard({ r }: { r: SemesterReport }) {
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-dark)' }}>
          {r.author_name || `#${r.author_id}`}{' '}
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>({ROLE_LABEL[r.author_role] || r.author_role})</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {semesterLabel(r.semester)}{r.faculty ? ` · ${r.faculty}` : ''}
        </div>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{r.content}</p>
      <StatsLine stats={r.stats_json} />
      <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 6 }}>
        Yuborilgan: {new Date(r.updated_at || r.created_at).toLocaleString('uz-UZ')}
      </div>
    </div>
  )
}

export default function SemesterReportsTab({ canAuthor, isCoordinator, isDeptHead, showToast }: Props) {
  const [semester, setSemester] = useState('')
  const [authorRoles, setAuthorRoles] = useState<string[]>([])
  const [authorRole, setAuthorRole] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [myReports, setMyReports] = useState<SemesterReport[]>([])
  const [reports, setReports] = useState<SemesterReport[]>([])
  const [filterSemester, setFilterSemester] = useState('')
  const [filterKind, setFilterKind] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const canViewOthers = isCoordinator || isDeptHead

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cur } = await client.get<{ semester: string; author_roles: string[] }>('/semester-reports/current-semester')
      setSemester(cur.semester)
      setAuthorRoles(cur.author_roles)
      setAuthorRole((prev) => prev || cur.author_roles[0] || '')
      if (canAuthor) {
        const { data } = await client.get<SemesterReport[]>('/semester-reports/my')
        setMyReports(data)
      }
      if (canViewOthers) {
        const { data } = await client.get<SemesterReport[]>('/semester-reports', {
          params: { semester: filterSemester || undefined, kind: filterKind || undefined },
        })
        setReports(data)
      }
    } catch (err) {
      showToast(extractErrorMessage(err, 'Hisobotlarni yuklashda xatolik yuz berdi'), 'error')
    } finally {
      setLoading(false)
    }
  }, [canAuthor, canViewOthers, filterSemester, filterKind, showToast])

  useEffect(() => {
    load()
  }, [load])

  const submitIndividual = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await client.post('/semester-reports', { content: content.trim(), author_role: authorRole || undefined })
      showToast('Semestr hisoboti yuborildi', 'success')
      setContent('')
      await load()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Hisobotni yuborishda xatolik yuz berdi'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const submitSummary = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await client.post('/semester-reports/faculty-summary', { content: summary.trim() })
      showToast("Umumlashtirilgan hisobot mas'ul bo'limga yuborildi", 'success')
      setSummary('')
      await load()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Hisobotni yuborishda xatolik yuz berdi'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const textareaStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    fontSize: 13.5,
    resize: 'vertical',
    fontFamily: 'inherit',
  }
  const buttonStyle: React.CSSProperties = {
    alignSelf: 'flex-start',
    padding: '9px 18px',
    border: 'none',
    background: '#059669',
    color: '#fff',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>Semestr hisobotlari</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Nizom 30-modda: ilmiy rahbarlar va tyutorlar semestr yakunida o'z yo'nalishi bo'yicha qisqa hisobot taqdim etadi;
          kafedra va fakultetlar ma'lumotlarni umumlashtirib, mas'ul bo'limga yuboradi.
          {semester && <> Joriy semestr: <strong>{semesterLabel(semester)}</strong>.</>}
        </p>
      </div>

      {canAuthor && authorRoles.length > 0 && (
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-heading)' }}>Mening hisobotim</h4>
          <form onSubmit={submitIndividual} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {authorRoles.length > 1 && (
              <select value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} style={{ ...textareaStyle, width: 220 }}>
                {authorRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                ))}
              </select>
            )}
            <textarea
              required
              minLength={20}
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Semestr davomida talabalar bilan olib borilgan ishlar, erishilgan natijalar, muammolar va takliflar (kamida 20 belgi)"
              style={textareaStyle}
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Talabalar soni, uchrashuvlar va tasdiqlangan yutuqlar statistikasi hisobotga avtomatik ilova qilinadi. Qayta yuborilsa hisobot yangilanadi.
            </div>
            <button type="submit" disabled={saving || content.trim().length < 20} style={buttonStyle}>
              {saving ? 'Yuborilmoqda...' : 'Hisobotni yuborish'}
            </button>
          </form>
          {myReports.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {myReports.map((r) => <ReportCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}

      {isCoordinator && (
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-heading)' }}>Fakultet bo'yicha umumlashtirilgan hisobot</h4>
          <form onSubmit={submitSummary} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              required
              minLength={20}
              rows={5}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Fakultet ilmiy rahbar va tyutorlari hisobotlari asosidagi xulosa va takliflar"
              style={textareaStyle}
            />
            <button type="submit" disabled={saving || summary.trim().length < 20} style={buttonStyle}>
              {saving ? 'Yuborilmoqda...' : "Mas'ul bo'limga yuborish"}
            </button>
          </form>
        </div>
      )}

      {canViewOthers && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-heading)' }}>
              {isDeptHead ? 'Barcha hisobotlar' : "Fakultetingiz hisobotlari"}
            </h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                placeholder={semester || 'YYYY-YYYY-1'}
                style={{ ...textareaStyle, width: 140, padding: '7px 10px' }}
              />
              <select value={filterKind} onChange={(e) => setFilterKind(e.target.value)} style={{ ...textareaStyle, padding: '7px 10px' }}>
                <option value="">Barchasi</option>
                <option value="individual">Rahbar/tyutor hisobotlari</option>
                <option value="faculty_summary">Fakultet umumlashtirgan</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>Yuklanmoqda...</div>
          ) : reports.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hisobotlar topilmadi</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map((r) => <ReportCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
