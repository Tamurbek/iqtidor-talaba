import { useMemo, useState } from 'react'
import client from '../../api/client'
import type { RankingItem } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'
import AssignSupervisorModal from './AssignSupervisorModal'

interface Props {
  ranking: RankingItem[] | null
  loading: boolean
  error: string | null
  onReload: () => void
  showToast: ShowToast
}

const selectStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#ffffff' }
const thStyle: React.CSSProperties = { padding: '12px 14px' }
const tdStyle: React.CSSProperties = { padding: '12px 14px' }

const rankBadge = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: bg, color, fontWeight: 800, fontSize: 13, border: `1px solid ${border}`,
})

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

async function downloadBlob(path: string, params: Record<string, string>, fallbackName: string) {
  const response = await client.get<Blob>(path, { params, responseType: 'blob' })
  const disposition = String(response.headers['content-disposition'] ?? '')
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match ? match[1] : fallbackName
  const url = window.URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

async function blobErrorMessage(err: unknown, fallback: string): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await data.text())
      if (parsed && typeof parsed === 'object' && 'detail' in parsed && typeof parsed.detail === 'string') return parsed.detail
    } catch {
      // not JSON
    }
    return fallback
  }
  return extractErrorMessage(err, fallback)
}

export default function RankingExportTab({ ranking, loading, error, onReload, showToast }: Props) {
  const [faculty, setFaculty] = useState('')
  const [direction, setDirection] = useState('')
  const [course, setCourse] = useState('')
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [supervisorTarget, setSupervisorTarget] = useState<RankingItem | null>(null)

  const list = useMemo(() => ranking ?? [], [ranking])
  const faculties = useMemo(() => unique(list.map((r) => r.faculty)), [list])
  const directions = useMemo(() => unique(list.map((r) => r.direction)), [list])
  const courses = useMemo(() => unique(list.map((r) => r.course_num)).sort((a, b) => a - b), [list])

  const filtered = list.filter(
    (r) =>
      (!faculty || r.faculty === faculty) &&
      (!direction || r.direction === direction) &&
      (!course || String(r.course_num) === course)
  )

  const downloadRankingExport = async (format: 'excel' | 'pdf') => {
    const params: Record<string, string> = {}
    if (faculty) params.faculty = faculty
    if (direction) params.direction = direction
    if (course) params.course = course

    setExporting(format)
    try {
      if (format === 'pdf') {
        await downloadBlob('/achievements/export-pdf', params, 'iqtidorli_talabalar_reyting.pdf')
      } else {
        await downloadBlob('/achievements/export-excel', params, 'iqtidorli_talabalar_reyting.xlsx')
      }
    } catch (err) {
      showToast(await blobErrorMessage(err, 'Faylni yuklab olishda xatolik yuz berdi'), 'error')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div id="tab-content-ranking" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0b3b70' }}>Filial iqtidorli talabalari umumiy reytingi</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Nizomning 2-ilovasi: GPA (20b) + 1-bosqich sinov imtihoni (40b) + Ilmiy-ijodiy yutuqlar (40b) = Jami 100 ball</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select id="rankingFacultyFilter" aria-label="Fakultet bo'yicha filtr" value={faculty} onChange={(e) => setFaculty(e.target.value)} style={selectStyle}>
              <option value="">Barcha fakultetlar</option>
              {faculties.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select id="rankingDirectionFilter" aria-label="Yo'nalish bo'yicha filtr" value={direction} onChange={(e) => setDirection(e.target.value)} style={selectStyle}>
              <option value="">Barcha yo'nalishlar</option>
              {directions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select id="rankingCourseFilter" aria-label="Kurs bo'yicha filtr" value={course} onChange={(e) => setCourse(e.target.value)} style={selectStyle}>
              <option value="">Barcha kurslar</option>
              {courses.map((c) => (
                <option key={c} value={String(c)}>{c}-kurs</option>
              ))}
            </select>
            <button type="button" disabled={exporting !== null} onClick={() => downloadRankingExport('excel')} style={{ background: '#0b3b70', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(11, 59, 112, 0.2)', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Excel (.xlsx)</span>
            </button>
            <button type="button" disabled={exporting !== null} onClick={() => downloadRankingExport('pdf')} style={{ background: '#b91c1c', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(185, 28, 28, 0.2)', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>PDF</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1400, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>O'rni</th>
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>Talaba F.I.SH.</th>
                <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>Fakultet va yo'nalish</th>
                <th style={{ ...thStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>1. GPA (maks 20)</th>
                <th style={{ ...thStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>2. Test sinovi (maks 40)</th>
                <th style={{ ...thStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>3. Yutuqlar (maks 40)</th>
                <th style={{ ...thStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>Ilmiy rahbar & Mavzu</th>
                <th style={{ ...thStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>JAMI (100)</th>
                <th style={{ ...thStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>Guvohnoma</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Yuklanmoqda...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={9} role="alert" style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Reyting ma'lumotlari mavjud emas.</td>
                </tr>
              )}
              {!loading && !error && filtered.map((r) => (
                <tr key={r.id} className="ranking-row" data-faculty={r.faculty} data-direction={r.direction} data-course={r.course_num} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    {r.rank === 1 ? (
                      <span style={rankBadge('#fef3c7', '#b45309', '#fde68a')}>1</span>
                    ) : r.rank === 2 ? (
                      <span style={rankBadge('#f1f5f9', '#475569', '#cbd5e1')}>2</span>
                    ) : r.rank === 3 ? (
                      <span style={rankBadge('#ffedd5', '#c2410c', '#fed7aa')}>3</span>
                    ) : (
                      <span style={{ fontWeight: 700, color: '#64748b', fontSize: 13, paddingLeft: 8 }}>{r.rank}</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>HEMIS: {r.hemis_id} | {r.course}</div>
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {r.faculty}
                    <br />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.direction}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ background: '#eff6ff', color: '#0284c7', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12.5 }}>
                      {r.gpa_points} ball
                    </span>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>GPA: {r.gpa}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {r.exam_status === 'passed' ? (
                      <>
                        <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12.5 }}>
                          {r.exam_score} ball
                        </span>
                        <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 600, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>O'tgan (60%+)</span>
                        </div>
                      </>
                    ) : r.exam_status === 'failed' ? (
                      <>
                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12.5 }}>
                          {r.exam_score} ball
                        </span>
                        <div style={{ fontSize: 10.5, color: '#dc2626', marginTop: 2 }}>O'tolmadi</div>
                      </>
                    ) : (
                      <>
                        <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                          0.0 ball
                        </span>
                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>Topshirmagan</div>
                      </>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ background: '#fdf4ff', color: '#a21caf', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12.5 }}>
                      {r.ach_points} ball
                    </span>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{r.approved_count} ta tasdiqlangan</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }} id={`sup-cell-${r.id}`}>
                    {r.supervisor_name ? (
                      <>
                        <div style={{ fontWeight: 700, color: '#0b3b70', fontSize: 13 }}>{r.supervisor_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }} title={r.research_topic || ''}>
                          {r.research_topic && r.research_topic.length > 26 ? r.research_topic.slice(0, 26) + '...' : r.research_topic || 'Mavzu belgilanmagan'}
                        </div>
                        <button type="button" onClick={() => setSupervisorTarget(r)} style={{ marginTop: 4, background: '#eff6ff', color: '#0284c7', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          Tahrirlash
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setSupervisorTarget(r)} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Biriktirish</span>
                      </button>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#0b3b70', fontSize: 16, whiteSpace: 'nowrap' }}>
                    {r.total_score} ball
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {r.exam_certificate ? (
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#0b3b70', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 4 }}>
                        {r.exam_certificate}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {supervisorTarget && (
        <AssignSupervisorModal
          student={supervisorTarget}
          onClose={() => setSupervisorTarget(null)}
          onSaved={(message) => {
            setSupervisorTarget(null)
            showToast(message, 'success')
            onReload()
          }}
        />
      )}
    </div>
  )
}
