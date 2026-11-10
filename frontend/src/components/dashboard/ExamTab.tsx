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
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ background: '#eff6ff', color: '#0284c7', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Nizom 1-bosqichi</span>
              <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Maksimal: 40 ball</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0b3b70', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>1-bosqich: Masofaviy sinov imtihoni (IQ, O'zbekiston tarixi, Chet tili)</span>
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              Nizomning 34&ndash;38-bandlariga asosan, nomzodlar maxsus platforma orqali 3 ta yo'nalishda sinovdan o'tadilar va o'tish bali bilan 2-bosqichga tavsiya etiladilar.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Muddat: <strong>15&ndash;30-mart</strong></div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginTop: 2 }}>O'tish chegarasi: 24 ball (60%)</div>
          </div>
        </div>

        {examStatusLoading && view !== 'active' ? (
          <p style={{ color: '#94a3b8', fontSize: 13.5 }}>Yuklanmoqda...</p>
        ) : (
          <div id="examContainer">
            {loadError && (
              <div style={{ padding: 14, borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 13.5, marginBottom: 20 }}>{loadError}</div>
            )}

            {view === 'result' && (
              <div id="examResultView">
                <div style={{ background: examPassed ? '#f0fdf4' : '#fef2f2', border: `1px solid ${examPassed ? '#bbf7d0' : '#fecaca'}`, borderRadius: 16, padding: 24, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: examPassed ? '#059669' : '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${examPassed ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`, flexShrink: 0 }}>
                      {examPassed ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 18, fontWeight: 800, color: examPassed ? '#166534' : '#991b1b' }}>
                        {examPassed ? '1-bosqich imtihoni muvaffaqiyatli topshirilgan!' : 'Imtihon natijasi o\'tish balidan past'}
                      </h4>
                      <p style={{ fontSize: 13.5, color: examPassed ? '#15803d' : '#b91c1c', marginTop: 2 }}>
                        {examPassed
                          ? "Siz saralashdan o'tdingiz va rasmiy elektron sertifikat bilan 2-yakuniy bosqichga tavsiya etildingiz."
                          : `Siz ${totalScore.toFixed(1)} ball to'pladingiz, o'tish uchun kamida 24 ball (60%) talab etiladi. Qaytadan urinib ko'rishingiz mumkin.`}
                      </p>
                    </div>
                  </div>
                  <button onClick={startFreshExam} style={{ background: '#ffffff', color: '#0b3b70', border: '1px solid #cbd5e1', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    <span>{examPassed ? 'Testni qayta ishlash (mashq)' : 'Testni qayta topshirish'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 30 }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>IQ darajasi testi</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#0284c7', marginTop: 6 }}>{iqScore.toFixed(1)} <span style={{ fontSize: 14, color: '#94a3b8' }}>/ 20</span></div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>10 ta savol (2 balldan)</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>O'zbekiston tarixi</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', marginTop: 6 }}>{historyScore.toFixed(1)} <span style={{ fontSize: 14, color: '#94a3b8' }}>/ 10</span></div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>10 ta savol (1 balldan)</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Chet tili (Ingliz tili)</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#7e22ce', marginTop: 6 }}>{langScore.toFixed(1)} <span style={{ fontSize: 14, color: '#94a3b8' }}>/ 10</span></div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>10 ta savol (1 balldan)</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #0b3b70 0%, #1e5ba3 100%)', color: '#ffffff', borderRadius: 12, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>JAMI SINOV BALI</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#34d399', marginTop: 6 }}>{totalScore.toFixed(1)} <span style={{ fontSize: 14, color: '#cbd5e1' }}>/ 40</span></div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Natija: <strong>{percentage}%</strong></div>
                  </div>
                </div>

                {examPassed && (
                <div id="printableCertificate" style={{ border: '4px double #0b3b70', borderRadius: 20, padding: 36, background: '#fdfefe', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', maxWidth: 820, margin: '0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0b3b70', paddingBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img src="/static/images/logo.png" alt="O'zMU" style={{ height: 52 }} />
                      <div>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>O'zbekiston Respublikasi Oliy ta'lim, fan va innovatsiyalar vazirligi</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0b3b70' }}>Mirzo Ulug'bek nomidagi O'zMU Jizzax filiali</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Guvohnoma №</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0b3b70' }}>{certNumber}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#f2721c' }}>RASMIY GUVOXNOMA / SERTIFIKAT</div>
                    <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0b3b70', marginTop: 8, letterSpacing: 0.5 }}>"IQTIDOR" TANLOVI 1-BOSQICH SARALASHI</h2>

                    <p style={{ fontSize: 15, color: '#475569', marginTop: 18 }}>Ushbu sertifikat tasdiqlaydiki,</p>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '6px 0', textDecoration: 'underline', textDecorationColor: '#f2721c' }}>
                      {user.full_name}
                    </div>
                    <p style={{ fontSize: 13.5, color: '#64748b' }}>(HEMIS ID: {user.hemis_id} | {user.faculty})</p>

                    <p style={{ fontSize: 14.5, color: '#334155', maxWidth: 620, margin: '18px auto 0', lineHeight: 1.6 }}>
                      Filial Kengashining 11-sonli bayonnomasi bilan tasdiqlangan "Iqtidor" tanlovi Nizomi talablariga muvofiq, 1-bosqich masofaviy sinov imtihonlarini (IQ, O'zbekiston tarixi va Chet tili) muvaffaqiyatli topshirib, <strong>40 balldan {totalScore.toFixed(1)} ball</strong> to'pladi hamda yakuniy 2-bosqichga yo'llanma oldi.
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed #cbd5e1', paddingTop: 20, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Filial direktori:</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>prof. O.X. Turakulov</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Sana: {examStatus?.created_at ? new Date(examStatus.created_at).toLocaleDateString('uz-UZ') : ''}</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 70, height: 70, borderRadius: '50%', border: '2px dashed #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', color: '#059669', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                        O'zMU<br />MUHR
                      </div>
                      <span style={{ fontSize: 10.5, color: '#059669', fontWeight: 700 }}>Elektron tasdiqlangan</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={downloadCertificatePdf}
                        disabled={certDownloading}
                        className="cert-no-print"
                        style={{ background: '#0b3b70', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: certDownloading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: certDownloading ? 0.7 : 1 }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>{certDownloading ? 'Tayyorlanmoqda...' : 'Rasmiy sertifikatni yuklab olish (PDF)'}</span>
                      </button>
                      {certError && (
                        <div className="cert-no-print" style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{certError}</div>
                      )}
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
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: '#0b3b70', marginBottom: 12 }}>
                      1-bosqich sinov imtihoni tartibi va qoidalari:
                    </h4>
                    <ul style={{ color: '#475569', fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
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
                        style={{ background: 'linear-gradient(135deg, #0070f3 0%, #0b3b70 100%)', color: '#ffffff', border: 'none', padding: '14px 34px', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: launching ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 18px rgba(0, 112, 243, 0.3)', opacity: launching ? 0.7 : 1 }}
                      >
                        <span>{launching ? 'Yuklanmoqda...' : 'Test sinovini boshlash'}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                    <div style={{ fontWeight: 700, color: '#0b3b70', marginBottom: 12, fontSize: 15 }}>Imtihon bloklari taqsimoti:</div>

                    <div style={{ marginBottom: 14, background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13 }}>
                        <span style={{ color: '#0284c7' }}>1-blok: IQ darajasi</span>
                        <span style={{ color: '#0284c7' }}>20 ball</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Mantiq, sonlar qonuniyati va fazoviy tafakkur</div>
                    </div>

                    <div style={{ marginBottom: 14, background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13 }}>
                        <span style={{ color: '#059669' }}>2-blok: O'zbekiston tarixi</span>
                        <span style={{ color: '#059669' }}>10 ball</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Mirzo Ulug'bek, Amir Temur va Yangi O'zbekiston</div>
                    </div>

                    <div style={{ background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13 }}>
                        <span style={{ color: '#7e22ce' }}>3-blok: Chet tili (Ingliz tili)</span>
                        <span style={{ color: '#7e22ce' }}>10 ball</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Akademik grammatika, leksika va til bilish</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'active' && currentQuestion && (
              <div id="examActiveView">
                <div style={{ background: '#0b3b70', color: '#ffffff', borderRadius: 14, padding: '16px 24px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
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
                          border: `1px solid ${isCurrent ? '#0b3b70' : isAnswered ? '#a7f3d0' : '#cbd5e1'}`,
                          background: isCurrent ? '#0b3b70' : isAnswered ? '#ecfdf5' : '#ffffff',
                          color: isCurrent ? '#ffffff' : isAnswered ? '#059669' : '#334155',
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

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>
                    <span>Ball: {currentQuestion.points.toFixed(1)} ball</span>
                    <span>{sectionCategory(currentQuestion.section)}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', lineHeight: 1.5, marginBottom: 22 }}>
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
                            border: `1.5px solid ${isSelected ? '#0070f3' : '#e2e8f0'}`,
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                          }}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt }))}
                        >
                          <input type="radio" name={`opt_${currentQuestion.id}`} checked={isSelected} readOnly style={{ width: 18, height: 18, accentColor: '#0070f3' }} />
                          <span style={{ fontSize: 14.5, color: isSelected ? '#0b3b70' : '#1e293b', fontWeight: isSelected ? 700 : 500 }}>{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <button
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 22px', borderRadius: 8, fontWeight: 600, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: currentIndex === 0 ? 0.5 : 1 }}
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
