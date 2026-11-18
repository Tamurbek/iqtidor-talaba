import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type {
  MonitoringPeriod,
  MonitoringReportResponse,
  MonitoringSummary,
  NotifyAtRiskResponse,
  StoredMonitoringReport,
  StoredMonitoringReportListResponse,
  StudentMonitoringItem,
  StudentMonitoringListResponse,
} from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import Pagination from '../common/Pagination'

const PAGE_SIZE = 10
const REPORTS_PAGE_SIZE = 10

const periodLabel: Record<string, string> = {
  monthly: 'Oylik',
  semester: 'Semestrlik',
  annual: "O'quv yili",
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  padding: 18,
}

const statCardStyle: React.CSSProperties = {
  ...cardStyle,
  flex: '1 1 180px',
  minWidth: 180,
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uz-UZ')
}

export default function MonitoringTab() {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null)
  const [students, setStudents] = useState<StudentMonitoringItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [onlyAtRisk, setOnlyAtRisk] = useState(false)
  const [faculty, setFaculty] = useState('')
  const [course, setCourse] = useState('')
  const [direction, setDirection] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [notifying, setNotifying] = useState(false)

  const [reports, setReports] = useState<StoredMonitoringReport[]>([])
  const [reportsPeriodFilter, setReportsPeriodFilter] = useState<MonitoringPeriod | ''>('')
  const [reportsPage, setReportsPage] = useState(1)
  const [reportsTotal, setReportsTotal] = useState(0)
  const [reportsTotalPages, setReportsTotalPages] = useState(1)
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportsError, setReportsError] = useState<string | null>(null)

  const [genPeriod, setGenPeriod] = useState<MonitoringPeriod>('monthly')
  const [generating, setGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<MonitoringReportResponse | null>(null)

  const filterParams = {
    faculty: faculty.trim() || undefined,
    course: course ? parseInt(course, 10) : undefined,
    direction: direction.trim() || undefined,
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, studentsRes] = await Promise.all([
        client.get<MonitoringSummary>('/monitoring/summary', { params: filterParams }),
        client.get<StudentMonitoringListResponse>('/monitoring/students', {
          params: { ...filterParams, only_at_risk: onlyAtRisk, page, page_size: PAGE_SIZE },
        }),
      ])
      setSummary(summaryRes.data)
      setStudents(studentsRes.data.items)
      setTotal(studentsRes.data.total)
      setTotalPages(studentsRes.data.total_pages)
    } catch (err) {
      setError(extractErrorMessage(err, "Monitoring ma'lumotlarini yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyAtRisk, faculty, course, direction, page])

  useEffect(() => {
    load()
  }, [load])

  const loadReports = useCallback(async () => {
    setReportsLoading(true)
    setReportsError(null)
    try {
      const { data } = await client.get<StoredMonitoringReportListResponse>('/monitoring/reports', {
        params: { period: reportsPeriodFilter || undefined, page: reportsPage, page_size: REPORTS_PAGE_SIZE },
      })
      setReports(data.items)
      setReportsTotal(data.total)
      setReportsTotalPages(data.total_pages)
    } catch (err) {
      setReportsError(extractErrorMessage(err, 'Hisobotlar tarixini yuklashda xatolik yuz berdi'))
    } finally {
      setReportsLoading(false)
    }
  }, [reportsPeriodFilter, reportsPage])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleGenerateReport = async () => {
    setGenerating(true)
    setError(null)
    setMessage(null)
    try {
      const { data } = await client.get<MonitoringReportResponse>('/monitoring/report', {
        params: { period: genPeriod, ...filterParams },
      })
      setGeneratedReport(data)
      setMessage(`${periodLabel[data.period] || data.period} hisobot generatsiya qilindi.`)
    } catch (err) {
      setError(extractErrorMessage(err, 'Hisobot generatsiya qilishda xatolik yuz berdi'))
    } finally {
      setGenerating(false)
    }
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  const handleNotifyAtRisk = async () => {
    if (!window.confirm("Faolligi pasaygan talabalar va ularning ilmiy rahbarlariga bildirishnoma yuborishni tasdiqlaysizmi?")) return
    setNotifying(true)
    setError(null)
    setMessage(null)
    try {
      const { data } = await client.post<NotifyAtRiskResponse>('/monitoring/notify-at-risk')
      setMessage(
        `Bildirishnoma yuborildi: ${data.meeting_overdue_notified} ta uchrashuv eslatmasi, ${data.plan_overdue_notified} ta reja muddati eslatmasi.`
      )
    } catch (err) {
      setError(extractErrorMessage(err, 'Bildirishnoma yuborishda xatolik yuz berdi'))
    } finally {
      setNotifying(false)
    }
  }

  if (loading && !summary) {
    return <div style={cardStyle}>Yuklanmoqda...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
      )}
      {message && (
        <div role="status" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>{message}</div>
      )}

      {summary && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <div style={statCardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jami talabalar</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-heading)' }}>{summary.total_students}</div>
          </div>
          <div style={{ ...statCardStyle, borderColor: summary.at_risk_count > 0 ? 'var(--badge-danger-border)' : 'var(--border-color)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Faolligi pasaygan</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.at_risk_count > 0 ? 'var(--badge-danger-text)' : 'var(--text-heading)' }}>
              {summary.at_risk_count}
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>O'rtacha faollik balli</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-heading)' }}>{summary.avg_activity_score}</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>O'rtacha reja bajarilishi</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-heading)' }}>{summary.avg_plan_completion_pct}%</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rejasi yo'q</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-heading)' }}>{summary.students_without_plan}</div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <input
            type="text"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            placeholder="Fakultet"
            style={{ padding: '9px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, minWidth: 160 }}
          />
          <input
            type="text"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="Yo'nalish"
            style={{ padding: '9px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, minWidth: 160 }}
          />
          <input
            type="number"
            min={1}
            max={7}
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Kurs"
            style={{ padding: '9px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, width: 90 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={onlyAtRisk} onChange={(e) => { setOnlyAtRisk(e.target.checked); setPage(1) }} />
            Faqat faolligi pasaygan talabalar
          </label>
          <button
            type="submit"
            style={{ padding: '9px 18px', border: '1px solid var(--border-color)', background: 'var(--bg-white)', color: 'var(--text-dark)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
          >
            Filtrlash
          </button>
          <button
            type="button"
            disabled={notifying}
            onClick={handleNotifyAtRisk}
            style={{ marginLeft: 'auto', padding: '9px 18px', border: 'none', background: '#dc2626', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {notifying ? 'Yuborilmoqda...' : 'Faolligi pasaygan talabalarga bildirishnoma yubor'}
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>Talabalar monitoringi</h3>
        {students.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 40 }}>Hozircha ma'lumot topilmadi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-table-header)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '8px 10px' }}>F.I.O.</th>
                  <th style={{ padding: '8px 10px' }}>Guruh</th>
                  <th style={{ padding: '8px 10px' }}>Oxirgi uchrashuv</th>
                  <th style={{ padding: '8px 10px' }}>Reja bajarilishi</th>
                  <th style={{ padding: '8px 10px' }}>Faollik balli</th>
                  <th style={{ padding: '8px 10px' }}>Holat</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)', background: s.is_at_risk ? 'var(--badge-danger-bg)' : 'transparent' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{s.full_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.hemis_id}</div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>{s.group_name ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{formatDate(s.last_meeting_date)}</td>
                    <td style={{ padding: '8px 10px' }}>{s.plan_completion_pct != null ? `${s.plan_completion_pct}%` : 'Rejasi yo\'q'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{s.activity_score}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {s.is_at_risk ? (
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>
                          Faolligi pasaygan
                        </span>
                      ) : (
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' }}>
                          Yaxshi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-heading)' }}>Hisobot generatsiya qilish (28-modda)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <select
            value={genPeriod}
            onChange={(e) => setGenPeriod(e.target.value as MonitoringPeriod)}
            style={{ padding: '9px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13 }}
          >
            <option value="monthly">Oylik</option>
            <option value="semester">Semestrlik</option>
            <option value="annual">O'quv yili</option>
          </select>
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerateReport}
            style={{ padding: '9px 18px', border: 'none', background: 'var(--badge-success-text)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {generating ? 'Generatsiya qilinmoqda...' : 'Hisobot yaratish'}
          </button>
        </div>

        {generatedReport && (
          <div style={{ marginTop: 16, border: '1px solid var(--border-light)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              {periodLabel[generatedReport.period] || generatedReport.period} hisobot &middot; {formatDate(generatedReport.generated_at)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <div style={statCardStyle}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jami talabalar</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>{generatedReport.summary.total_students}</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Faolligi pasaygan</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>{generatedReport.summary.at_risk_count}</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>O'rtacha faollik balli</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>{generatedReport.summary.avg_activity_score}</div>
              </div>
              {generatedReport.summary.avg_meetings_in_period != null && (
                <div style={statCardStyle}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Davrdagi o'rtacha uchrashuvlar</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>{generatedReport.summary.avg_meetings_in_period}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-heading)' }}>Hisobotlar tarixi</h3>
          <select
            value={reportsPeriodFilter}
            onChange={(e) => { setReportsPeriodFilter(e.target.value as MonitoringPeriod | ''); setReportsPage(1) }}
            style={{ marginLeft: 'auto', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13 }}
          >
            <option value="">Barcha davrlar</option>
            <option value="monthly">Oylik</option>
            <option value="semester">Semestrlik</option>
            <option value="annual">O'quv yili</option>
          </select>
        </div>

        {reportsError && (
          <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', marginBottom: 12 }}>{reportsError}</div>
        )}

        {reportsLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 24 }}>Yuklanmoqda...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 40 }}>Hozircha saqlangan hisobotlar yo'q</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-table-header)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '8px 10px' }}>Sana</th>
                  <th style={{ padding: '8px 10px' }}>Davr</th>
                  <th style={{ padding: '8px 10px' }}>Jami talabalar</th>
                  <th style={{ padding: '8px 10px' }}>Faolligi pasaygan</th>
                  <th style={{ padding: '8px 10px' }}>O'rtacha faollik balli</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const summary = r.summary_json as Partial<MonitoringSummary>
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px 10px' }}>{formatDate(r.generated_at)}</td>
                      <td style={{ padding: '8px 10px' }}>{periodLabel[r.period] || r.period}</td>
                      <td style={{ padding: '8px 10px' }}>{summary.total_students ?? '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{r.at_risk_count}</td>
                      <td style={{ padding: '8px 10px' }}>{summary.avg_activity_score ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={reportsPage} totalPages={reportsTotalPages} total={reportsTotal} pageSize={REPORTS_PAGE_SIZE} onPageChange={setReportsPage} />
      </div>
    </div>
  )
}
