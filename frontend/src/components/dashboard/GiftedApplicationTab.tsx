import { useEffect, useState } from 'react'
import client from '../../api/client'
import type { GiftedApplication, SelectionPeriod } from '../../types/dashboard'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  application: GiftedApplication | null
  loading: boolean
  error: string | null
  onSubmitted: (application: GiftedApplication) => void
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>Qabul qilindi</span>
      </span>
    )
  }
  if (status === 'revoked') {
    return (
      <span style={{ background: 'var(--bg-light)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
        Maqom bekor qilingan
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span style={{ background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>Rad etilgan</span>
      </span>
    )
  }
  return (
    <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>Ko'rib chiqilmoqda</span>
    </span>
  )
}

export default function GiftedApplicationTab({ application, loading, error, onSubmitted }: Props) {
  const [motivation, setMotivation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [period, setPeriod] = useState<SelectionPeriod | null>(null)

  useEffect(() => {
    client
      .get<SelectionPeriod | null>('/selection-periods/current')
      .then(({ data }) => setPeriod(data))
      .catch(() => setPeriod(null))
  }, [])

  // Rad etilgan talaba keyingi (yangi) saralash davrida qayta ariza topshira oladi
  const canApplyAgain = !!application && (application.status === 'rejected' || application.status === 'revoked') && !!period?.is_open && application.period_id !== period.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data } = await client.post<GiftedApplication>('/gifted-applications', { motivation_text: motivation || null })
      onSubmitted(data)
    } catch (err) {
      setSubmitError(extractErrorMessage(err, 'Ariza yuborishda xatolik yuz berdi'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="student-tab-pane" id="student-tab-gifted-application" style={{ display: 'block' }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5 5.8 21l2.4-7.3L2 9.2h7.6z"></path>
            </svg>
            <span>Iqtidorli talaba sifatida saralashga ariza</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 3 }}>
            Nizom 7.1/9/10-modda: dasturga "iqtidorli talaba" sifatida qabul qilinish uchun rasmiy ariza.
          </p>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            background: period?.is_open ? 'var(--badge-success-bg)' : 'var(--badge-warning-bg)',
            color: period?.is_open ? 'var(--badge-success-text)' : 'var(--badge-warning-text)',
          }}
        >
          {period ? (
            <>
              <strong>{period.title}</strong>: {new Date(period.start_date).toLocaleDateString('uz-UZ')} — {new Date(period.end_date).toLocaleDateString('uz-UZ')}
              {period.is_open ? ' (arizalar qabul qilinmoqda)' : ' (hali boshlanmagan)'}
            </>
          ) : (
            "Hozirda saralash davri ochiq emas. Arizalar direktor buyrug'i bilan tasdiqlangan jadval bo'yicha qabul qilinadi (Nizom 8-modda)."
          )}
        </div>

        {error && (
          <div style={{ padding: 14, borderRadius: 10, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', border: '1px solid var(--badge-danger-border)', fontSize: 13.5, marginBottom: 16 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</div>
        ) : application && !canApplyAgain ? (
          <div style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Topshirilgan sana: {new Date(application.created_at).toLocaleDateString('uz-UZ')}
                </div>
                {application.motivation_text && (
                  <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-dark)' }}>{application.motivation_text}</p>
                )}
                {application.revoke_reason && (
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--badge-danger-text)' }}>
                    <strong>Maqom bekor qilinish sababi:</strong> {application.revoke_reason}
                  </p>
                )}
                {application.decision_note && (
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-table-header)' }}>
                    <strong>Komissiya izohi:</strong> {application.decision_note}
                  </p>
                )}
              </div>
              <StatusBadge status={application.status} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>
              Motivatsion matn (ixtiyoriy)
            </label>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={5}
              placeholder="Nega 'iqtidorli talaba' sifatida saralashni so'rayapsiz? Ilmiy qiziqishlaringiz, maqsadlaringiz haqida qisqacha yozing."
              style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 12, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
            {submitError && (
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', fontSize: 13.5 }}>{submitError}</div>
            )}
            <button
              type="submit"
              disabled={submitting || !period?.is_open}
              style={{ alignSelf: 'flex-start', background: '#f2721c', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Yuborilmoqda...' : 'Arizani yuborish'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
