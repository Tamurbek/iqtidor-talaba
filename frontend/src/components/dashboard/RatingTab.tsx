import type { User } from '../../types/user'
import type { ExamStatus } from '../../types/dashboard'

interface Props {
  user: User
  examStatus: ExamStatus | null
  achievementsPoints: number
  onGoToCalculator: () => void
}

export default function RatingTab({ user, examStatus, achievementsPoints, onGoToCalculator }: Props) {
  const examScore = examStatus?.status === 'passed' ? (examStatus.total_score ?? 0) : 0
  const gpa = user.avg_gpa || 5.0
  const gpaScore = Math.min(20, gpa * 4)
  const achScore = Math.min(40, achievementsPoints)
  const totalScore = Math.min(100, Math.round((examScore + gpaScore + achScore) * 10) / 10)

  return (
    <div className="student-tab-pane" id="student-tab-rating" style={{ display: 'block' }}>
      {/* Hero Stats with Badge and Reward Banner */}
      <div style={{ background: 'linear-gradient(135deg, #072950 0%, #0b3b70 100%)', borderRadius: 20, padding: 28, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, boxShadow: '0 10px 30px rgba(7, 41, 80, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.25)', flexShrink: 0, padding: 4, overflow: 'hidden' }}>
            <img src="/static/images/nizom_image1.png" alt="Iqtidorli talaba ko'krak nishoni" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <span style={{ background: 'rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              Nizom bo'yicha 100 ballik shkala
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>"Iqtidorli talaba" ko'krak nishoni va mukofot reytingi</h2>
            <p style={{ color: '#cbd5e1', fontSize: 13.5, marginTop: 2 }}>
              G'oliblar bazaviy stipendiyaning 10 baravarigacha moddiy rag'bat va rasmiy ko'krak nishoni bilan taqdirlanadi (VM-59).
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.1)', padding: '14px 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>Umumiy jamg'arilgan ball</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#34d399' }} id="statTotalScore">
            {totalScore} <span style={{ fontSize: 16, color: '#94a3b8' }}>/ 100</span>
          </div>
          <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>O'tish chegarasidan o'tgan (60+ ball)</span>
          </div>
        </div>
      </div>

      {/* 4 Core Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20, marginTop: 24 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>1. Sinov imtihonlari</span>
            <span style={{ background: '#eff6ff', color: '#0284c7', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Maks. 40</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0284c7', marginTop: 8 }}>{examScore.toFixed(1)} <span style={{ fontSize: 15, color: '#94a3b8' }}>/ 40</span></div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>IQ (20 ball), Tarix (10 ball), Chet tili (10 ball)</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>2. GPA o'zlashtirish (GPA*4)</span>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Maks. 20</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 8 }}>{gpaScore.toFixed(1)} <span style={{ fontSize: 15, color: '#94a3b8' }}>/ 20</span></div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>HEMIS GPA: {gpa.toFixed(2)} (proporsional 100%)</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>3. Ilmiy-ijodiy yutuqlar</span>
            <span style={{ background: '#fff7ed', color: '#ea580c', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Maks. 40</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f2721c', marginTop: 8 }}>{achScore.toFixed(1)} <span style={{ fontSize: 15, color: '#94a3b8' }}>/ 40</span></div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Scopus, OAK, Patent, Zakovat, Tanlovlar</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>G'oliblik maqomi</span>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{totalScore >= 60 ? 'Tasdiqlangan' : 'Kutilmoqda'}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0b3b70', marginTop: 8, lineHeight: 1.3 }}>
            "Yangi avlod yaratuvchisi" nominatsiyasi
          </div>
          <p style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Ko'krak nishoniga tavsiya etilgan</span>
          </p>
        </div>
      </div>

      {/* Nizom 2-ilovasidagi 10 ta indikatorning to'liq jadvali */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, marginTop: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0b3b70', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Nizomning 2-ilovasidagi 10 ta baholash indikatori bo'yicha to'plangan ballar</span>
            </h3>
            <p style={{ color: '#64748b', fontSize: 13.5, marginTop: 3 }}>Har bir indikator bo'yicha maksimal va joriy to'plangan ballar taqsimoti</p>
          </div>
          <button onClick={onGoToCalculator} style={{ background: '#f2721c', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>Kalkulyatorda hisoblash</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px' }}>T/r</th>
                <th style={{ padding: '12px 16px' }}>Nizom baholash mezoni</th>
                <th style={{ padding: '12px 16px' }}>Hisoblash qoidasi</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Maks. ball</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Sizning balingiz</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['1', 'Sinov imtihon natijalari', 'IQ (20 ball) + Tarix (10 ball) + Chet tili (10 ball)', '40', examScore.toFixed(1)],
                ['2', "Fanlarni o'zlashtirish ko'rsatkichi", 'GPA * 4 proporsiyasi', '20', gpaScore.toFixed(1)],
                ['3', "Ma'naviy-ma'rifiy tanlovlardagi ishtiroki", 'Kamida universitet miqyosida, har biri 0.5 balldan', '4', '-'],
                ['4', 'Ilmiy-innovatsion tanlovlardagi ishtiroki', 'Universitet miqyosida 2 ball, respublika/xalqaro 8 ballgacha', '8', '-'],
                ['5', 'Intellektual o\'yinlar va kitobxonlik tanlovlari', 'Kamida universitet miqyosida, har biri 1 balldan', '5', '-'],
                ['6', '"Scopus" va "Web of Science" maqolalari', 'Har bir maqola uchun 4 balldan', '8', '-'],
                ['7', 'OAK tasarrufidagi jurnallardagi maqolalar', 'Soniga nisbatan', '4', '-'],
                ['8', 'Mahalliy va xalqaro konferensiya maqola/tezislari', 'Maqola va tezislar soniga qarab', '2', '-'],
                ['9', 'Ixtiro, patent hamda mualliflik loyihalari (DGU)', 'Soniga nisbatan', '5', '-'],
                ['10', 'Boshqa yutuqlar', "Ko'rik-tanlov diplomlari", '3', '-'],
              ].map((row) => (
                <tr key={row[0]} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{row[0]}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0b3b70' }}>{row[1]}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{row[2]}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{row[3]}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{row[4]}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0fdf4', fontWeight: 800, color: '#0b3b70' }}>
                <td colSpan={3} style={{ padding: '14px 16px', fontSize: 15 }}>JAMI YAKUNIY BALL:</td>
                <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 15 }}>100</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 18, color: '#059669' }}>{totalScore} ball</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
