import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import type { CommissionMember, SelectionPeriod } from '../../types/dashboard'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'

interface Props {
  /** Faqat mas'ul bo'lim (department head) davr yaratadi/tahrirlaydi (Nizom 8, 33-modda). */
  canManage: boolean
  showToast: ShowToast
}

interface FormState {
  title: string
  academic_year: string
  order_number: string
  start_date: string
  end_date: string
  quota: string
  commission_member_ids: number[]
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
}

function emptyForm(): FormState {
  const y = new Date().getFullYear()
  return { title: '', academic_year: `${y}-${y + 1}`, order_number: '', start_date: '', end_date: '', quota: '', commission_member_ids: [] }
}

function toDateInput(value: string): string {
  return value ? value.slice(0, 10) : ''
}

function fmt(value: string): string {
  return new Date(value).toLocaleDateString('uz-UZ')
}

export default function SelectionPeriodsPanel({ canManage, showToast }: Props) {
  const [periods, setPeriods] = useState<SelectionPeriod[]>([])
  const [members, setMembers] = useState<CommissionMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get<SelectionPeriod[]>('/selection-periods')
      setPeriods(data)
      if (canManage) {
        const res = await client.get<CommissionMember[]>('/selection-periods/eligible-members')
        setMembers(res.data)
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Saralash davrlarini yuklashda xatolik yuz berdi"))
    } finally {
      setLoading(false)
    }
  }, [canManage])

  useEffect(() => {
    load()
  }, [load])

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  const startEdit = (p: SelectionPeriod) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      academic_year: p.academic_year,
      order_number: p.order_number || '',
      start_date: toDateInput(p.start_date),
      end_date: toDateInput(p.end_date),
      quota: p.quota ? String(p.quota) : '',
      commission_member_ids: p.commission_member_ids,
    })
    setShowForm(true)
  }

  const toggleMember = (id: number) =>
    setForm((f) => ({
      ...f,
      commission_member_ids: f.commission_member_ids.includes(id)
        ? f.commission_member_ids.filter((m) => m !== id)
        : [...f.commission_member_ids, id],
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      academic_year: form.academic_year.trim(),
      order_number: form.order_number.trim() || null,
      start_date: `${form.start_date}T00:00:00`,
      end_date: `${form.end_date}T23:59:59`,
      quota: form.quota ? Number(form.quota) : null,
      commission_member_ids: form.commission_member_ids,
    }
    try {
      if (editingId) {
        await client.patch(`/selection-periods/${editingId}`, payload)
        showToast('Saralash davri yangilandi', 'success')
      } else {
        await client.post('/selection-periods', payload)
        showToast('Saralash davri yaratildi', 'success')
      }
      setShowForm(false)
      await load()
    } catch (err) {
      showToast(extractErrorMessage(err, 'Saqlashda xatolik yuz berdi'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ ...cardStyle, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Saralash davrlari</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Nizom 8-modda: saralash direktor buyrug'i bilan tasdiqlangan jadval va mas'ul komissiya asosida; 14.5-modda: tasdiqlangan kvota.
          </p>
        </div>
        {canManage && !showForm && (
          <button type="button" onClick={startCreate} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Yangi davr
          </button>
        )}
      </div>

      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', marginBottom: 12 }}>{error}</div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleSubmit} style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Davr nomi (masalan: 2026-2027 o'quv yili saralashi)" style={{ ...inputStyle, flex: '2 1 260px' }} />
            <input required pattern="\d{4}-\d{4}" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2026-2027" style={{ ...inputStyle, width: 120 }} />
            <input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} placeholder="Buyruq raqami va sanasi" style={{ ...inputStyle, flex: '1 1 180px' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
              Boshlanish
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
              Tugash
              <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
              Kvota (talaba soni)
              <input type="number" min={1} value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} placeholder="cheklanmagan" style={{ ...inputStyle, width: 140 }} />
            </label>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>
              Komissiya a'zolari ({form.commission_member_ids.length})
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map((m) => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dark)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.commission_member_ids.includes(m.id)} onChange={() => toggleMember(m.id)} />
                  {m.full_name} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({m.role})</span>
                </label>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Komissiya belgilansa, shu davr arizalari bo'yicha qarorni faqat uning a'zolari (va bo'lim boshlig'i) qabul qiladi.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saqlanmoqda...' : editingId ? 'Saqlash' : 'Yaratish'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--bg-light)', color: 'var(--text-dark)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Bekor qilish
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-light)' }}>Yuklanmoqda...</div>
      ) : periods.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Hozircha saralash davri belgilanmagan. Davr ochilmaguncha talabalar saralash arizasini topshira olmaydi.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {periods.map((p) => (
            <div key={p.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
                  {p.title}{' '}
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: p.is_open ? 'var(--badge-success-bg)' : 'var(--bg-light)', color: p.is_open ? 'var(--badge-success-text)' : 'var(--text-muted)' }}>
                    {p.is_open ? 'Ochiq' : 'Yopiq'}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  {p.academic_year} &middot; {fmt(p.start_date)} — {fmt(p.end_date)}
                  {p.order_number ? ` · Buyruq: ${p.order_number}` : ''}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Arizalar: {p.applications_count} &middot; Qabul qilingan: {p.approved_count}
                  {p.quota ? ` / ${p.quota} (kvota)` : ' (kvota belgilanmagan)'}
                </div>
                {p.commission_members.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Komissiya: {p.commission_members.map((m) => m.full_name).join(', ')}
                  </div>
                )}
              </div>
              {canManage && (
                <button type="button" onClick={() => startEdit(p)} style={{ alignSelf: 'flex-start', background: 'var(--bg-light)', color: 'var(--text-dark)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }}>
                  Tahrirlash
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
