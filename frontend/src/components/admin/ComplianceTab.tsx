import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface IntegrityViolation {
  id: number
  student_id: number
  student_name?: string | null
  student_hemis_id?: string | null
  achievement_id?: number | null
  violation_type: string
  description: string
  action_taken?: string | null
  recorded_by_name?: string | null
  created_at: string
}

interface IncentiveProposal {
  id: number
  target_user_id: number
  target_name?: string | null
  target_role: string
  incentive_type: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | string
  proposed_by_name?: string | null
  decision_note?: string | null
  decided_at?: string | null
  created_at: string
}

interface Props {
  /** Qoidabuzarlikni qayd etish: mas'ul bo'lim, koordinator, ilmiy rahbar (Nizom 16.5, 25, 36) */
  canRecordViolations: boolean
  /** Rag'batlantirish taklifi bo'yicha qaror: mas'ul bo'lim (Nizom 33) */
  isDeptHead: boolean
  showToast: ShowToast
}

const VIOLATION_TYPES: Record<string, string> = {
  plagiat: 'Plagiat / iqtibos qoidalari buzilishi',
  soxta_hujjat: 'Soxta yoki tasdiqlanmagan hujjat',
  notogri_malumot: "Noto'g'ri ma'lumot taqdim etish",
  boshqa: 'Boshqa qoidabuzarlik',
}

const INCENTIVE_TYPES: Record<string, string> = {
  tashakkurnoma: 'Tashakkurnoma',
  moddiy_ragbat: "Moddiy rag'bat",
  stipendiyaga_tavsiya: 'Stipendiyaga tavsiya',
  boshqa: 'Boshqa',
}

const TARGET_ROLES: Record<string, string> = {
  student: 'Talaba',
  supervisor: 'Ilmiy rahbar',
  tutor: 'Tyutor',
}

const STATUS: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: "Ko'rib chiqilmoqda", color: 'var(--badge-warning-text)', bg: 'var(--badge-warning-bg)' },
  approved: { text: "Ma'qullangan", color: 'var(--badge-success-text)', bg: 'var(--badge-success-bg)' },
  rejected: { text: 'Rad etilgan', color: 'var(--badge-danger-text)', bg: 'var(--badge-danger-bg)' },
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 16,
  padding: 20,
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
}

const buttonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '8px 16px',
  border: 'none',
  background: '#059669',
  color: '#fff',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

export default function ComplianceTab({ canRecordViolations, isDeptHead, showToast }: Props) {
  const [violations, setViolations] = useState<IntegrityViolation[]>([])
  const [proposals, setProposals] = useState<IncentiveProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [vHemis, setVHemis] = useState('')
  const [vAchievement, setVAchievement] = useState('')
  const [vType, setVType] = useState('plagiat')
  const [vDesc, setVDesc] = useState('')
  const [vAction, setVAction] = useState('')

  const [pLogin, setPLogin] = useState('')
  const [pRole, setPRole] = useState('student')
  const [pType, setPType] = useState('tashakkurnoma')
  const [pReason, setPReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [v, p] = await Promise.all([
        client.get<IntegrityViolation[]>('/integrity-violations'),
        client.get<IncentiveProposal[]>('/incentive-proposals'),
      ])
      setViolations(v.data)
      setProposals(p.data)
    } catch (err) {
      showToast(extractErrorMessage(err, "Ma'lumotlarni yuklashda xatolik yuz berdi"), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    load()
  }, [load])

  const submitViolation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (vAchievement && !window.confirm("Ko'rsatilgan yutuq rad etilib, baholashdan chiqariladi. Davom etasizmi?")) return
    setSaving(true)
    try {
      await client.post('/integrity-violations', {
        student_hemis_id: vHemis.trim(),
        achievement_id: vAchievement ? Number(vAchievement) : null,
        violation_type: vType,
        description: vDesc.trim(),
        action_taken: vAction.trim() || null,
      })
      showToast('Qoidabuzarlik qayd etildi, talabaga xabar yuborildi', 'success')
      setVHemis('')
      setVAchievement('')
      setVDesc('')
      setVAction('')
      await load()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Saqlashda xatolik yuz berdi'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await client.post('/incentive-proposals', {
        target_login: pLogin.trim(),
        target_role: pRole,
        incentive_type: pType,
        reason: pReason.trim(),
      })
      showToast("Rag'batlantirish taklifi yuborildi", 'success')
      setPLogin('')
      setPReason('')
      await load()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Saqlashda xatolik yuz berdi'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    const note = window.prompt(status === 'approved' ? 'Qaror izohi (ixtiyoriy):' : 'Rad etish sababi:', '')
    if (note === null) return
    try {
      await client.post(`/incentive-proposals/${id}/decide`, { status, decision_note: note || null })
      showToast('Qaror saqlandi', 'success')
      await load()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Xatolik yuz berdi'), 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canRecordViolations && (
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>Ilmiy halollik va qoidabuzarliklar</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Nizom 16.5, 25, 36-modda: plagiat, soxta hujjat yoki noto'g'ri ma'lumot qayd etiladi; yutuq ko'rsatilsa, u baholashdan chiqariladi.
          </p>
          <form onSubmit={submitViolation} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input required value={vHemis} onChange={(e) => setVHemis(e.target.value)} placeholder="Talaba HEMIS ID" style={{ ...inputStyle, width: 180 }} />
              <input type="number" min={1} value={vAchievement} onChange={(e) => setVAchievement(e.target.value)} placeholder="Yutuq ID (ixtiyoriy)" style={{ ...inputStyle, width: 170 }} />
              <select value={vType} onChange={(e) => setVType(e.target.value)} style={inputStyle}>
                {Object.entries(VIOLATION_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <textarea required minLength={10} rows={3} value={vDesc} onChange={(e) => setVDesc(e.target.value)} placeholder="Holat tavsifi (kamida 10 belgi)" style={{ ...inputStyle, resize: 'vertical' }} />
            <input value={vAction} onChange={(e) => setVAction(e.target.value)} placeholder="Ko'rilgan chora (ixtiyoriy)" style={inputStyle} />
            <button type="submit" disabled={saving || vDesc.trim().length < 10} style={{ ...buttonStyle, background: '#dc2626' }}>
              Qayd etish
            </button>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--text-light)' }}>Yuklanmoqda...</div>
            ) : violations.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Qayd etilgan qoidabuzarliklar yo'q</div>
            ) : (
              violations.map((v) => (
                <div key={v.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                    {v.student_name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({v.student_hemis_id})</span> — {VIOLATION_TYPES[v.violation_type] || v.violation_type}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{v.description}</div>
                  {v.action_taken && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Chora: {v.action_taken}</div>}
                  <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
                    {new Date(v.created_at).toLocaleDateString('uz-UZ')} · {v.recorded_by_name}
                    {v.achievement_id ? ` · yutuq #${v.achievement_id} baholashdan chiqarildi` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-heading)' }}>Rag'batlantirish takliflari</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Nizom 7.8, 33-modda: faoliyati samarali bo'lgan talabalar, ilmiy rahbarlar va tyutorlarni rag'batlantirish bo'yicha takliflar;
          qarorni mas'ul bo'lim qabul qiladi.
        </p>
        <form onSubmit={submitProposal} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input required value={pLogin} onChange={(e) => setPLogin(e.target.value)} placeholder="HEMIS ID / login" style={{ ...inputStyle, width: 180 }} />
            <select value={pRole} onChange={(e) => setPRole(e.target.value)} style={inputStyle}>
              {Object.entries(TARGET_ROLES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={pType} onChange={(e) => setPType(e.target.value)} style={inputStyle}>
              {Object.entries(INCENTIVE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <textarea required minLength={10} rows={3} value={pReason} onChange={(e) => setPReason(e.target.value)} placeholder="Asoslash: erishilgan natijalar (kamida 10 belgi)" style={{ ...inputStyle, resize: 'vertical' }} />
          <button type="submit" disabled={saving || pReason.trim().length < 10} style={buttonStyle}>
            Taklif yuborish
          </button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {!loading && proposals.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{isDeptHead ? "Takliflar yo'q" : "Siz hali taklif kiritmagansiz"}</div>
          )}
          {proposals.map((p) => {
            const st = STATUS[p.status] || { text: p.status, color: 'var(--text-muted)', bg: 'var(--bg-light)' }
            return (
              <div key={p.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                    {p.target_name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({TARGET_ROLES[p.target_role] || p.target_role})</span> — {INCENTIVE_TYPES[p.incentive_type] || p.incentive_type}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 999 }}>{st.text}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{p.reason}</div>
                {p.decision_note && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Qaror: {p.decision_note}</div>}
                <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
                  {new Date(p.created_at).toLocaleDateString('uz-UZ')} · taklif: {p.proposed_by_name}
                </div>
                {isDeptHead && p.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => decide(p.id, 'approved')} style={{ ...buttonStyle, padding: '6px 12px', fontSize: 12 }}>Ma'qullash</button>
                    <button type="button" onClick={() => decide(p.id, 'rejected')} style={{ ...buttonStyle, padding: '6px 12px', fontSize: 12, background: '#ef4444' }}>Rad etish</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
