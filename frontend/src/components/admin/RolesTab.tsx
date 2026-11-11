import { useState } from 'react'
import client from '../../api/client'
import type { RoleItem } from '../../types/admin'
import { extractErrorMessage } from '../../types/dashboard'
import type { ShowToast } from './AdminToasts'
import RoleFormModal from './RoleFormModal'

interface Props {
  roles: RoleItem[] | null
  loading: boolean
  error: string | null
  onReload: () => void
  onRoleDeleted: (roleId: number) => void
  showToast: ShowToast
}

const PROTECTED_CODES = ['super_admin', 'department_head', 'student', 'starosta']

export default function RolesTab({ roles, loading, error, onReload, onRoleDeleted, showToast }: Props) {
  // undefined = yopiq, null = yangi rol, number = tahrirlash
  const [modalRoleId, setModalRoleId] = useState<number | null | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const list = roles ?? []

  const deleteRole = async (role: RoleItem) => {
    const confirmed = window.confirm(`'${role.name}' rolini o'chirib yuborishni tasdiqlaysizmi? Ushbu amal ortga qaytarilmaydi.`)
    if (!confirmed) return

    setDeletingId(role.id)
    try {
      const { data } = await client.delete<{ message?: string }>(`/roles/${role.id}`)
      onRoleDeleted(role.id)
      showToast(data.message || "Rol muvaffaqiyatli o'chirildi", 'success')
    } catch (err) {
      showToast(extractErrorMessage(err, "Rolni o'chirishda xatolik yuz berdi"), 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div id="tab-content-roles-management" className="tab-pane" style={{ display: 'block', marginTop: 0 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 26, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-heading)' }}>Dinamik rollar va huquqlar tizimi (Dynamic RBAC)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 3 }}>Tizim foydalanuvchilariga bir nechta rol biriktirish, yangi rollar yaratish, tahrirlash va huquqlarni erkin taqsimlash (CRUD)</p>
          </div>
          <button type="button" onClick={() => setModalRoleId(null)} style={{ background: '#0070f3', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(0,112,243,0.25)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Yangi rol yaratish</span>
          </button>
        </div>

        {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Yuklanmoqda...</div>}
        {!loading && error && (
          <div role="alert" style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</div>
        )}
        {!loading && !error && list.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Hozircha rollar mavjud emas.</div>
        )}

        {!loading && !error && list.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 20 }} id="rolesCardsGrid">
            {list.map((r) => (
              <div key={r.id} id={`role-card-${r.id}`} style={{ border: '1px solid var(--border-color)', borderRadius: 14, padding: 20, background: '#fafcff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      {r.code}
                    </span>
                    {r.is_system ? (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, background: 'var(--border-light)', padding: '2px 8px', borderRadius: 4 }}>Tizim asosiy roli</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '2px 8px', borderRadius: 4 }}>Maxsus rol</span>
                    )}
                  </div>
                  <h4 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-heading)', marginTop: 10 }} id={`role-title-${r.id}`}>{r.name}</h4>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }} id={`role-desc-${r.id}`}>{r.description || "Ta'rif kiritilmagan"}</p>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-table-header)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Biriktirilgan huquqlar (<span id={`role-perm-count-${r.id}`}>{r.permissions.length}</span> ta):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }} id={`role-perms-list-${r.id}`}>
                      {r.permissions.length > 0 ? (
                        r.permissions.map((p) => (
                          <span key={p.id} style={{ background: 'var(--bg-white)', border: '1px solid #cbd5e1', color: 'var(--text-secondary)', fontSize: 11, padding: '2px 8px', borderRadius: 6 }}>
                            {p.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic' }}>Maxsus ruxsatlar biriktirilmagan</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                    {r.user_count} nafar foydalanuvchida
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setModalRoleId(r.id)} style={{ background: 'var(--border-light)', color: 'var(--text-heading)', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Tahrirlash</span>
                    </button>
                    {!r.is_system && !PROTECTED_CODES.includes(r.code) && (
                      <button type="button" disabled={deletingId === r.id} onClick={() => deleteRole(r)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>O'chirish</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalRoleId !== undefined && (
        <RoleFormModal
          roleId={modalRoleId}
          onClose={() => setModalRoleId(undefined)}
          onSaved={(message) => {
            setModalRoleId(undefined)
            showToast(message, 'success')
            onReload()
          }}
        />
      )}
    </div>
  )
}
