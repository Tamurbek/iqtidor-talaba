import type { User } from '../../types/user'

interface Props {
  user: User
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-white)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  padding: 18,
}

/**
 * Nizom 17, 24-modda: tyutorga biriktirilgan talabalar ro'yxati va
 * davomat/intizom belgilash paneli.
 *
 * Talabalar ro'yxatini qaytaruvchi backend endpoint (GET /api/tutor/students)
 * tyutor-talaba bog'lanish jadvali BOSQICH 2 (individual rivojlanish rejasi)
 * bilan birga qo'shiladi, shu sababli hozircha bo'sh holat ko'rsatiladi.
 */
export default function TutorTab({ user }: Props) {
  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Biriktirilgan talabalar</h3>
      <p style={{ color: 'var(--text-muted)' }}>
        Hurmatli {user.full_name}, tyutor sifatida sizga biriktirilgan talabalar ro'yxati va
        davomat/intizom belgilash funksiyasi tez kunda ishga tushiriladi.
      </p>
    </div>
  )
}
