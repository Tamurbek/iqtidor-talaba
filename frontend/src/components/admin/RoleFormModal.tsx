import { useEffect, useState } from 'react'
import client from '../../api/client'
import type { PermissionsResponse, RoleDetail, RolePermission } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'

interface Props {
  roleId: number | null
  onClose: () => void
  onSaved: (message: string) => void
}

const MODULE_LABELS: Record<string, string> = {
  starostas: 'Guruh sardorlari boshqaruvi',
  achievements: 'Ilmiy yutuqlar va moderatsiya',
  contests: 'Tanlovlar va saralash arizalari',
  exams: '1-bosqich test imtihonlari',
  roles: 'Rollar va xavfsizlik huquqlari',
  users: 'Foydalanuvchilar boshqaruvi',
  reports: 'Hisobotlar va reytinglar',
  group: 'Guruh faoliyati monitoringi',
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13.5, background: 'var(--bg-white)', color: 'var(--text-dark)' }

export default function RoleFormModal({ roleId, onClose, onSaved }: Props) {
  const isEdit = roleId !== null
  const [modules, setModules] = useState<Record<string, RolePermission[]> | null>(null)
  const [role, setRole] = useState<RoleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const permsReq = client.get<PermissionsResponse>('/roles/permissions')
        const roleReq = roleId !== null ? client.get<RoleDetail>(`/roles/${roleId}`) : null
        const [permsRes, roleRes] = await Promise.all([permsReq, roleReq])
        if (cancelled) return
        setModules(permsRes.data.modules || {})
        if (roleRes) {
          const r = roleRes.data
          setRole(r)
          setName(r.name)
          setCode(r.code)
          setDescription(r.description || '')
          setSelected(new Set(r.permission_ids || []))
        }
      } catch (err) {
        if (!cancelled) setLoadError(extractErrorMessage(err, "Rol ma'lumotlarini yuklab bo'lmadi"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [roleId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const autoGenerateRoleCode = (val: string) => {
    setName(val)
    if (!isEdit) {
      setCode(val.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').substring(0, 30))
    }
  }

  const togglePerm = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleModulePerms = (perms: RolePermission[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      perms.forEach((p) => (checked ? next.add(p.id) : next.delete(p.id)))
      return next
    })
  }

  const submitSaveRole = async () => {
    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    if (!trimmedName) {
      setError('Rol nomini kiritish majburiy.')
      return
    }
    if (!isEdit && !trimmedCode) {
      setError('Rol kodini kiritish majburiy.')
      return
    }

    const payload: { name: string; description: string; permission_ids: number[]; code?: string } = {
      name: trimmedName,
      description: description.trim(),
      permission_ids: Array.from(selected),
    }
    if (trimmedCode) payload.code = trimmedCode

    setSubmitting(true)
    setError(null)
    try {
      const { data } = isEdit
        ? await client.put<{ message?: string }>(`/roles/${roleId}`, payload)
        : await client.post<{ message?: string }>('/roles', payload)
      onSaved(data.message || 'Rol muvaffaqiyatli saqlandi!')
    } catch (err) {
      setError(extractErrorMessage(err, 'Rolni saqlashda xatolik yuz berdi'))
      setSubmitting(false)
    }
  }

  const codeDisabled = isEdit && !!role?.is_system

  return (
    <div id="roleModalOverlay" role="dialog" aria-modal="true" aria-labelledby="roleModalTitle" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-white)', borderRadius: 16, maxWidth: 680, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isEdit ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 id="roleModalTitle" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>Rolni tahrirlash</h3>
                {role && (
                  <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{role.code}</span>
                )}
              </div>
            ) : (
              <h3 id="roleModalTitle" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>Yangi rol yaratish</h3>
            )}
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {isEdit ? "Rol ma'lumotlari va unga biriktirilgan huquqlarni yangilash" : 'Yangi maxsus rol yarating va unga kerakli huquqlarni belgilang'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" title="Yopish" style={{ background: 'none', border: 'none', padding: 6, borderRadius: 6, color: 'var(--text-light)', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style={{ padding: '22px 26px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</div>
          ) : loadError ? (
            <div role="alert" style={{ padding: 12, borderRadius: 8, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{loadError}</div>
          ) : (
            <>
              {error && (
                <div role="alert" style={{ padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13, background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}>{error}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label htmlFor="roleInputName" style={labelStyle}>Rol nomi *</label>
                  <input type="text" id="roleInputName" value={name} placeholder={isEdit ? undefined : "Masalan: Kafedra mas'ul eksperti"} onChange={(e) => autoGenerateRoleCode(e.target.value)} style={{ ...inputStyle, fontWeight: 600 }} />
                </div>
                <div>
                  <label htmlFor="roleInputCode" style={labelStyle}>{isEdit ? 'Tizim kodi' : 'Tizim kodi (Slug) *'}</label>
                  <input
                    type="text"
                    id="roleInputCode"
                    value={code}
                    disabled={codeDisabled}
                    placeholder={isEdit ? undefined : 'kafedra_masul'}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ ...inputStyle, fontFamily: 'monospace', background: codeDisabled ? 'var(--border-light)' : isEdit ? undefined : 'var(--bg-light)', cursor: codeDisabled ? 'not-allowed' : undefined }}
                  />
                  {codeDisabled && (
                    <span style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, display: 'block' }}>Tizim asosiy rolining kodi o'zgarmaydi</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="roleInputDesc" style={labelStyle}>Rol tavsifi</label>
                <textarea id="roleInputDesc" rows={2} value={description} placeholder={isEdit ? undefined : "Ushbu rol foydalanuvchilariga beriladigan vakolatlar haqida qisqacha ma'lumot..."} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, fontSize: 13, resize: 'vertical' }}></textarea>
              </div>

              <div style={{ marginBottom: 10 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text-heading)', marginBottom: 8 }}>
                  {isEdit ? 'Biriktirilgan huquqlar va vakolatlar:' : 'Biriktiriladigan huquqlar va vakolatlar:'}
                </span>
                {Object.entries(modules ?? {}).map(([moduleKey, perms]) => {
                  const allChecked = perms.length > 0 && perms.every((p) => selected.has(p.id))
                  return (
                    <div key={moduleKey} style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 13 }}>{MODULE_LABELS[moduleKey] || moduleKey}</span>
                        <label style={{ fontSize: 11.5, color: 'var(--badge-info-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <input type="checkbox" checked={allChecked} onChange={(e) => toggleModulePerms(perms, e.target.checked)} />
                          <span>Barchasi</span>
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {perms.map((p) => (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input type="checkbox" className={`role-perm-checkbox perm-mod-${moduleKey}`} value={p.id} checked={selected.has(p.id)} onChange={(e) => togglePerm(p.id, e.target.checked)} style={{ marginTop: 2 }} />
                            <span>
                              <strong>{p.name}</strong>
                              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-light)', fontFamily: 'monospace' }}>{p.code}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '16px 26px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--bg-light)', borderRadius: '0 0 16px 16px' }}>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', color: 'var(--text-table-header)', padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Bekor qilish
          </button>
          <button type="button" id="btnSubmitRole" disabled={submitting || loading || !!loadError} onClick={submitSaveRole} style={{ background: '#0070f3', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,112,243,0.3)' }}>
            {submitting ? 'Saqlanmoqda...' : isEdit ? "O'zgarishlarni saqlash" : 'Rolni saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}
