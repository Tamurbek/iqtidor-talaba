import { useEffect, useRef, useState } from 'react'
import client from '../../api/client'
import type { User } from '../../types/user'
import type {
  ExamQuestion,
  ExamQuestionsResponse,
  ExamStartResponse,
  ExamStatus,
  ExamSubmitResponse,
} from '../../types/dashboard'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  user: User
  examStatus: ExamStatus | null
  examStatusLoading: boolean
  onExamSubmitted: (result: ExamSubmitResponse) => void
}

type ViewMode = 'result' | 'intro' | 'active'

function sectionLabel(section: ExamQuestion['section']) {
  if (section === 'iq') return "1-blok: IQ darajasi"
  if (section === 'history') return "2-blok: O'zbekiston tarixi"
  return "3-blok: Chet tili (Ingliz tili)"
}

function sectionCategory(section: ExamQuestion['section']) {
  if (section === 'iq') return 'Kategoriya: Mantiq va IQ darajasi'
  if (section === 'history') return "Kategoriya: O'zbekiston tarixi"
  return "Kategoriya: Chet tili (Ingliz tili)"
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function smartCase(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

const CERT_GOLD = '#B08D2B'

function CertCornerFlourish({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const position: React.CSSProperties =
    corner === 'tl' ? { top: 6, left: 6 } :
    corner === 'tr' ? { top: 6, right: 6 } :
    corner === 'bl' ? { bottom: 6, left: 6 } :
    { bottom: 6, right: 6 }
  const scaleX = corner === 'tr' || corner === 'br' ? -1 : 1
  const scaleY = corner === 'bl' || corner === 'br' ? -1 : 1
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" style={{ position: 'absolute', ...position, transform: `scale(${scaleX}, ${scaleY})`, pointerEvents: 'none' }}>
      <path d="M2 30 C2 13 13 2 30 2" fill="none" stroke={CERT_GOLD} strokeWidth="1.6" />
      <path d="M2 21 C2 10 10 2 21 2" fill="none" stroke={CERT_GOLD} strokeWidth="0.9" />
      <circle cx="5.5" cy="5.5" r="1.8" fill={CERT_GOLD} />
    </svg>
  )
}

export default function ExamTab({ user, examStatus, examStatusLoading, onExamSubmitted }: Props) {
  const passed = examStatus?.status === 'passed'
  const [view, setView] = useState<ViewMode>(passed ? 'result' : 'intro')
  const [resultData, setResultData] = useState<ExamSubmitResponse | ExamStatus | null>(examStatus)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)

  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(45 * 60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [certDownloading, setCertDownloading] = useState(false)
  const [certError, setCertError] = useState<string | null>(null)

  const downloadCertificatePdf = async () => {
    setCertDownloading(true)
    setCertError(null)
    try {
      const response = await client.get<Blob>('/exam/certificate/pdf', { responseType: 'blob' })
      const disposition = String(response.headers['content-disposition'] ?? '')
      const match = /filename="?([^";]+)"?/i.exec(disposition)
      const filename = match ? match[1] : `sertifikat_${certNumber || 'iqtidor'}.pdf`
      const url = window.URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setCertError(extractErrorMessage(err, 'Sertifikatni yuklab olishda xatolik yuz berdi'))
    } finally {
      setCertDownloading(false)
    }
  }

  useEffect(() => {
    setView(passed ? 'result' : 'intro')
    setResultData(examStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startTimer = (initialSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSecondsRemaining(initialSeconds)
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          submitExam({})
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const launchInteractiveExam = async () => {
    setLaunching(true)
    setLoadError(null)
    try {
      const { data } = await client.get<ExamQuestionsResponse>('/exam/questions')

      if (data.already_passed) {
        const confirmed = window.confirm("Siz ushbu sinovdan avval o'tgansiz. Yangidan mashq sifatida ishlashni xohlaysizmi?")
        if (!confirmed) {
          setLaunching(false)
          return
        }
      }

      const { data: startData } = await client.post<ExamStartResponse>('/exam/start')

      const allQuestions = [...data.sections.iq, ...data.sections.history, ...data.sections.lang]
      setQuestions(allQuestions)
      setAnswers({})
      setCurrentIndex(0)
      setView('active')
      startTimer(startData.remaining_seconds)
    } catch (err) {
      setLoadError(extractErrorMessage(err, 'Imtihon savollarini yuklashda xatolik yuz berdi'))
    } finally {
      setLaunching(false)
    }
  }

  const submitExam = async (answersOverride?: Record<string, string>) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)
    try {
      const { data } = await client.post<ExamSubmitResponse>('/exam/submit', answersOverride ?? answers)
      setResultData(data)
      setView('result')
      onExamSubmitted(data)
    } catch (err) {
      setLoadError(extractErrorMessage(err, 'Imtihonni topshirishda xatolik yuz berdi'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinishClick = async () => {
    const answeredCount = Object.keys(answers).length
    const confirmed = window.confirm(
      `Siz ${questions.length} ta savoldan ${answeredCount} tasiga javob berdingiz. Haqiqatan ham imtihonni yakunlab, natijalarni hisoblamoqchimisiz?`
    )
    if (!confirmed) return
    await submitExam()
  }

  const startFreshExam = () => {
    setView('intro')
  }

  const currentQuestion = questions[currentIndex]

  const iqScore = resultData?.iq_score ?? 0
  const historyScore = resultData?.history_score ?? 0
  const langScore = resultData?.lang_score ?? 0
  const totalScore = resultData?.total_score ?? 0
  const percentage = resultData?.percentage ?? 0
  const certNumber = resultData?.certificate_number ?? ''
  const examPassed = resultData?.status === 'passed'

  return (
    <div className="student-tab-pane" id="student-tab-online-exam" style={{ display: 'block' }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Nizom 1-bosqichi</span>
              <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Maksimal: 40 ball</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>1-bosqich: Masofaviy sinov imtihoni (IQ, O'zbekiston tarixi, Chet tili)</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              Nizomning 34&ndash;38-bandlariga asosan, nomzodlar maxsus platforma orqali 3 ta yo'nalishda sinovdan o'tadilar va o'tish bali bilan 2-bosqichga tavsiya etiladilar.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Muddat: <strong>15&ndash;30-mart</strong></div>
            <div style={{ fontSize: 12, color: 'var(--badge-success-text)', fontWeight: 700, marginTop: 2 }}>O'tish chegarasi: 24 ball (60%)</div>
          </div>
        </div>

        {examStatusLoading && view !== 'active' ? (
          <p style={{ color: 'var(--text-light)', fontSize: 13.5 }}>Yuklanmoqda...</p>
        ) : (
          <div id="examContainer">
            {loadError && (
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', border: '1px solid var(--badge-danger-border)', fontSize: 13.5, marginBottom: 20 }}>{loadError}</div>
            )}

            {view === 'result' && (
              <div id="examResultView">
                <div style={{ background: examPassed ? 'var(--badge-success-bg)' : 'var(--badge-danger-bg)', border: `1px solid ${examPassed ? 'var(--badge-success-text)' : 'var(--badge-danger-border)'}`, borderRadius: 16, padding: 24, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: examPassed ? 'var(--badge-success-text)' : 'var(--badge-danger-text)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${examPassed ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`, flexShrink: 0 }}>
                      {examPassed ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 18, fontWeight: 800, color: examPassed ? 'var(--badge-success-text)' : 'var(--badge-danger-text)' }}>
                        {examPassed ? '1-bosqich imtihoni muvaffaqiyatli topshirilgan!' : 'Imtihon natijasi o\'tish balidan past'}
                      </h4>
                      <p style={{ fontSize: 13.5, color: examPassed ? 'var(--badge-success-text)' : 'var(--badge-danger-text)', marginTop: 2 }}>
                        {examPassed
                          ? "Siz saralashdan o'tdingiz va rasmiy elektron sertifikat bilan 2-yakuniy bosqichga tavsiya etildingiz."
                          : `Siz ${totalScore.toFixed(1)} ball to'pladingiz, o'tish uchun kamida 24 ball (60%) talab etiladi. Qaytadan urinib ko'rishingiz mumkin.`}
                      </p>
                    </div>
                  </div>
                  <button onClick={startFreshExam} style={{ background: 'var(--bg-white)', color: 'var(--text-heading)', border: '1px solid #cbd5e1', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    <span>{examPassed ? 'Testni qayta ishlash (mashq)' : 'Testni qayta topshirish'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 30 }}>
                  <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>IQ darajasi testi</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--badge-info-text)', marginTop: 6 }}>{iqScore.toFixed(1)} <span style={{ fontSize: 14, color: 'var(--text-light)' }}>/ 20</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>10 ta savol (2 balldan)</div>
                  </div>
                  <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>O'zbekiston tarixi</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--badge-success-text)', marginTop: 6 }}>{historyScore.toFixed(1)} <span style={{ fontSize: 14, color: 'var(--text-light)' }}>/ 10</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>10 ta savol (1 balldan)</div>
                  </div>
                  <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Chet tili (Ingliz tili)</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--badge-purple-text)', marginTop: 6 }}>{langScore.toFixed(1)} <span style={{ fontSize: 14, color: 'var(--text-light)' }}>/ 10</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>10 ta savol (1 balldan)</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #1e5ba3 100%)', color: '#ffffff', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>JAMI SINOV BALI</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#34d399', marginTop: 6 }}>{totalScore.toFixed(1)} <span style={{ fontSize: 14, color: '#cbd5e1' }}>/ 40</span></div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Natija: <strong>{percentage}%</strong></div>
                  </div>
                </div>

                {examPassed && (
                <div
                  id="printableCertificate"
                  style={{
                    position: 'relative',
                    maxWidth: 900,
                    margin: '0 auto',
                    background: 'radial-gradient(ellipse at center, #FBF6EA 0%, #F1E8D2 100%)',
                    border: `2.4px solid ${CERT_GOLD}`,
                    borderRadius: 14,
                    padding: 10,
                    boxShadow: '0 14px 34px rgba(11,37,69,0.14)',
                  }}
                >
                  <div style={{ position: 'relative', border: '1px solid #0B2545', borderRadius: 8, padding: '30px 38px 26px' }}>
                    <CertCornerFlourish corner="tl" />
                    <CertCornerFlourish corner="tr" />
                    <CertCornerFlourish corner="bl" />
                    <CertCornerFlourish corner="br" />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src="/static/images/ozmu-emblem.png" alt="O'zMU Jizzax filiali" style={{ height: 50 }} />
                        <div>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: '#746B55' }}>
                            O'zbekiston Respublikasi Oliy ta'lim, fan va innovatsiyalar vazirligi
                          </div>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 600, color: '#0B2545', marginTop: 3 }}>
                            Mirzo Ulug'bek nomidagi O'zMU Jizzax filiali
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 11.5, color: '#746B55' }}>Guvohnoma raqami</div>
                          <div style={{ fontFamily: "'EB Garamond', serif", fontWeight: 600, fontSize: 15, color: '#0B2545' }}>{certNumber}</div>
                        </div>
                        <div style={{ background: 'var(--bg-white)', border: `1px solid ${CERT_GOLD}`, borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
                          <img src="/static/images/logo.png" alt="Iqtidorli talabalar platformasi" style={{ height: 34 }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 18px' }}>
                      <div style={{ flex: 1, height: 1, background: CERT_GOLD }} />
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: CERT_GOLD, flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 1, background: CERT_GOLD }} />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 600, letterSpacing: 4, color: CERT_GOLD }}>
                        RASMIY GUVOHNOMA &middot; SERTIFIKAT
                      </div>
                      <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 32, fontWeight: 700, color: '#0B2545', margin: '12px 0 2px' }}>
                        &ldquo;IQTIDOR&rdquo; TANLOVI
                      </h2>
                      <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 17, color: '#13315C' }}>1-BOSQICH SARALASHI</div>

                      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 16, color: '#3A3A3A', marginTop: 22 }}>
                        Ushbu sertifikat tasdiqlaydiki,
                      </p>

                      <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: 44, color: '#0B2545', margin: '4px 0 4px', lineHeight: 1.2 }}>
                        {smartCase(user.full_name)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: 420, margin: '0 auto 10px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: CERT_GOLD, flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 1, background: CERT_GOLD }} />
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: CERT_GOLD, flexShrink: 0 }} />
                      </div>

                      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: '#746B55' }}>
                        (HEMIS ID: {user.hemis_id} | {user.faculty})
                      </p>

                      <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: '#3A3A3A', maxWidth: 620, margin: '16px auto 0', lineHeight: 1.65 }}>
                        Filial Kengashining 11-sonli bayonnomasi bilan tasdiqlangan &ldquo;Iqtidor&rdquo; tanlovi Nizomi talablariga muvofiq, 1-bosqich masofaviy sinov imtihonlarini (IQ, O'zbekiston tarixi va Chet tili) muvaffaqiyatli topshirib, <strong style={{ color: '#0B2545' }}>40 balldan {totalScore.toFixed(1)} ball</strong> to'pladi hamda yakuniy 2-bosqichga yo'llanma oldi.
                      </p>
                    </div>

                    <div style={{ display: 'flex', margin: '26px 0 22px', border: `1px solid ${CERT_GOLD}`, borderRadius: 10, background: '#FFFDF8', overflow: 'hidden' }}>
                      {[
                        { label: 'IQ DARAJASI', val: iqScore.toFixed(1), max: 20, highlight: false },
                        { label: "O'ZBEKISTON TARIXI", val: historyScore.toFixed(1), max: 10, highlight: false },
                        { label: 'CHET TILI', val: langScore.toFixed(1), max: 10, highlight: false },
                        { label: 'JAMI SINOV BALI', val: totalScore.toFixed(1), max: 40, highlight: true },
                      ].map((item, i) => (
                        <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '16px 8px', borderLeft: i > 0 ? `1px solid ${CERT_GOLD}` : 'none' }}>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11.5, fontWeight: 600, letterSpacing: 0.5, color: item.highlight ? CERT_GOLD : '#746B55' }}>
                            {item.label}
                          </div>
                          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: item.highlight ? 27 : 25, fontWeight: 600, color: '#0B2545', marginTop: 6 }}>
                            {item.val} / {item.max}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px dashed ${CERT_GOLD}`, paddingTop: 18, flexWrap: 'wrap', gap: 14 }}>
                      <div>
                        <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 13.5, color: '#746B55' }}>Filial direktori</div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 17, fontWeight: 600, color: '#0B2545' }}>prof. O.X. Turakulov</div>
                        <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: '#9C9375', marginTop: 3 }}>
                          Sana: {examStatus?.created_at ? new Date(examStatus.created_at).toLocaleDateString('uz-UZ') : ''}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', border: `1px dashed ${CERT_GOLD}`, opacity: 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                          <div>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 600, color: '#746B55' }}>M.O'.</div>
                            <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 9, color: '#746B55' }}>(muhr o'rni)</div>
                          </div>
                        </div>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11.5, color: '#0E7C4A', fontWeight: 600, letterSpacing: 0.4 }}>ELEKTRON TASDIQLANGAN</span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <button
                          onClick={downloadCertificatePdf}
                          disabled={certDownloading}
                          className="cert-no-print"
                          style={{ background: '#0B2545', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: certDownloading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: certDownloading ? 0.7 : 1 }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          <span>{certDownloading ? 'Tayyorlanmoqda...' : 'Rasmiy sertifikatni yuklab olish (PDF)'}</span>
                        </button>
                        {certError && (
                          <div className="cert-no-print" style={{ marginTop: 8, fontSize: 12, color: 'var(--badge-danger-text)' }}>{certError}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}

            {view === 'intro' && (
              <div id="examIntroView">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28, alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)', marginBottom: 12 }}>
                      1-bosqich sinov imtihoni tartibi va qoidalari:
                    </h4>
                    <ul style={{ color: 'var(--text-table-header)', fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
                      <li>Jami savollar soni: <strong>30 ta savol</strong> (IQ: 10 ta, Tarix: 10 ta, Chet tili: 10 ta).</li>
                      <li>Ajratilgan umumiy vaqt: <strong>45 daqiqa</strong> (teskari taymer hisobi bilan).</li>
                      <li>Maksimal to'plash mumkin bo'lgan ball: <strong>40 ball</strong>.</li>
                      <li>IQ savollari: <strong>har biri 2 balldan</strong> (jami 20 ball).</li>
                      <li>O'zbekiston tarixi: <strong>har biri 1 balldan</strong> (jami 10 ball).</li>
                      <li>Chet tili (Ingliz tili): <strong>har biri 1 balldan</strong> (jami 10 ball).</li>
                      <li>O'tish chegarasi: <strong>kamida 24 ball (60%)</strong> to'plash talab etiladi.</li>
                    </ul>

                    <div style={{ marginTop: 24 }}>
                      <button
                        onClick={launchInteractiveExam}
                        disabled={launching}
                        style={{ background: 'linear-gradient(135deg, #0070f3 0%, var(--primary-color) 100%)', color: '#ffffff', border: 'none', padding: '14px 34px', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: launching ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 18px rgba(0, 112, 243, 0.3)', opacity: launching ? 0.7 : 1 }}
                      >
                        <span>{launching ? 'Yuklanmoqda...' : 'Test sinovini boshlash'}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: 12, fontSize: 15 }}>Imtihon bloklari taqsimoti:</div>

                    <div style={{ marginBottom: 14, background: 'var(--bg-white)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13 }}>
                        <span style={{ color: 'var(--badge-info-text)' }}>1-blok: IQ darajasi</span>
                        <span style={{ color: 'var(--badge-info-text)' }}>20 ball</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Mantiq, sonlar qonuniyati va fazoviy tafakkur</div>
                    </div>

                    <div style={{ marginBottom: 14, background: 'var(--bg-white)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13 }}>
                        <span style={{ color: 'var(--badge-success-text)' }}>2-blok: O'zbekiston tarixi</span>
                        <span style={{ color: 'var(--badge-success-text)' }}>10 ball</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Mirzo Ulug'bek, Amir Temur va Yangi O'zbekiston</div>
                    </div>

                    <div style={{ background: 'var(--bg-white)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13 }}>
                        <span style={{ color: 'var(--badge-purple-text)' }}>3-blok: Chet tili (Ingliz tili)</span>
                        <span style={{ color: 'var(--badge-purple-text)' }}>10 ball</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Akademik grammatika, leksika va til bilish</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'active' && currentQuestion && (
              <div id="examActiveView">
                <div style={{ background: 'var(--primary-color)', color: '#ffffff', borderRadius: 14, padding: '16px 24px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                      {sectionLabel(currentQuestion.section)}
                    </span>
                    <span style={{ fontSize: 13, color: '#cbd5e1' }}>Savol {currentIndex + 1} / {questions.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.25)', padding: '6px 16px', borderRadius: 20 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f2721c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#f2721c', fontFamily: 'monospace' }}>{formatTime(secondsRemaining)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }} id="qNavGrid">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentIndex
                    const isAnswered = Boolean(answers[q.id])
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          border: `1px solid ${isCurrent ? 'var(--primary-color)' : isAnswered ? 'var(--badge-success-text)' : '#cbd5e1'}`,
                          background: isCurrent ? 'var(--primary-color)' : isAnswered ? 'var(--badge-success-bg)' : 'var(--bg-white)',
                          color: isCurrent ? '#ffffff' : isAnswered ? 'var(--badge-success-text)' : 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>

                <div style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
                    <span>Ball: {currentQuestion.points.toFixed(1)} ball</span>
                    <span>{sectionCategory(currentQuestion.section)}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.5, marginBottom: 22 }}>
                    {currentIndex + 1}. {currentQuestion.question}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answers[currentQuestion.id] === opt
                      return (
                        <label
                          key={opt}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 18px',
                            borderRadius: 10,
                            border: `1.5px solid ${isSelected ? '#0070f3' : 'var(--border-color)'}`,
                            background: isSelected ? 'var(--badge-info-bg)' : 'var(--bg-white)',
                            cursor: 'pointer',
                          }}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt }))}
                        >
                          <input type="radio" name={`opt_${currentQuestion.id}`} checked={isSelected} readOnly style={{ width: 18, height: 18, accentColor: '#0070f3' }} />
                          <span style={{ fontSize: 14.5, color: isSelected ? 'var(--primary-color)' : 'var(--text-dark)', fontWeight: isSelected ? 700 : 500 }}>{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <button
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    style={{ background: 'var(--bg-white)', border: '1px solid #cbd5e1', color: 'var(--text-table-header)', padding: '10px 22px', borderRadius: 8, fontWeight: 600, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: currentIndex === 0 ? 0.5 : 1 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    <span>Oldingi savol</span>
                  </button>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {currentIndex < questions.length - 1 ? (
                      <button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} style={{ background: '#0070f3', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>Keyingi savol</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </button>
                    ) : (
                      <button onClick={handleFinishClick} disabled={submitting} style={{ background: '#0070f3', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: submitting ? 0.7 : 1 }}>
                        <span>Yakunlash</span>
                      </button>
                    )}
                    <button onClick={handleFinishClick} disabled={submitting} style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: submitting ? 0.7 : 1 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      <span>{submitting ? 'Yuborilmoqda...' : 'Imtihonni yakunlash'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
