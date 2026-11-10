import { useMemo, useState, type CSSProperties } from 'react'
import type { User } from '../../types/user'

interface Props {
  user: User
}

interface Tier {
  label: string
  background: string
  color: string
  description: string
}

function getTier(total: number): Tier {
  if (total >= 90.0) {
    return {
      label: "“Iqtidor” tanlovi mutlaq g'olibi (Ko'krak nishoni)",
      background: 'rgba(16, 185, 129, 0.3)',
      color: '#10b981',
      description: "Mukammal ko'rsatkich! Nizomning 3-bobiga binoan bazaviy stipendiyaning 10 baravari miqdorida bir martalik mukofot va “IQTIDORLI TALABA” ko'krak nishoni beriladi.",
    }
  }
  if (total >= 80.0) {
    return {
      label: "Nominatsiya g'olibi va Ko'krak nishoni nomzodi",
      background: 'rgba(2, 132, 199, 0.3)',
      color: '#38bdf8',
      description: "Yetakchi ko'rsatkich. Har bir mutaxassislik yo'nalishidagi kvota doirasida g'oliblikka va ko'krak nishoni bilan taqdirlanishga to'liq tavsiya etiladi.",
    }
  }
  if (total >= 60.0) {
    return {
      label: "Rag'batlantirish nomzodi (60+ ball)",
      background: 'rgba(242, 114, 28, 0.3)',
      color: '#fb923c',
      description: "Nizomning 60 ballik minimal o'tish talabi bajarildi. Filial Kengashi tomonidan rag'batlantirish kvotasi doirasida ko'rib chiqiladi.",
    }
  }
  return {
    label: "Yetarli emas (60 balldan kam)",
    background: 'rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    description: "Nizomning 60-bandiga muvofiq, yakuniy natijalarga ko'ra 60 balldan kam to'plagan nomzodlar rag'batlantirilmaydi. Scopus maqolasi yoki patent yuklash tavsiya etiladi.",
  }
}

const numberFieldStyle: CSSProperties = {
  width: '100%',
  marginTop: 6,
  padding: '8px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: 15,
}

export default function CalculatorTab({ user }: Props) {
  const [exam, setExam] = useState(38)
  const [gpa, setGpa] = useState(user.avg_gpa || 5.0)
  const [scopus, setScopus] = useState(2)
  const [oak, setOak] = useState(1)
  const [patent, setPatent] = useState(1)
  const [innovFilial, setInnovFilial] = useState(0)
  const [innovRespublika, setInnovRespublika] = useState(1)
  const [zakovat, setZakovat] = useState(4)
  const [spiritual, setSpiritual] = useState(4)
  const [conf, setConf] = useState(1)
  const [other, setOther] = useState(1)

  const result = useMemo(() => {
    const examPts = Math.min(40.0, Math.max(0, exam))
    const gpaPts = Math.min(20.0, Math.max(0, Math.round(gpa * 4.0 * 10) / 10))

    const scopusPts = Math.min(8.0, scopus * 4.0)
    const oakPts = Math.min(4.0, oak * 4.0)
    const patentPts = Math.min(5.0, patent * 5.0)
    const innovFilialPts = Math.min(2.0, innovFilial * 2.0)
    const innovRespublikaPts = Math.min(8.0, innovRespublika * 8.0)
    const innovPts = Math.min(8.0, innovFilialPts + innovRespublikaPts)
    const zakovatPts = Math.min(5.0, zakovat * 1.0)
    const spiritualPts = Math.min(4.0, spiritual * 0.5)
    const confPts = Math.min(2.0, conf * 1.0)
    const otherPts = Math.min(4.0, other * 2.0)

    const achTotal = Math.min(40.0, scopusPts + oakPts + patentPts + innovPts + zakovatPts + spiritualPts + confPts + otherPts)
    const total = Math.min(100.0, Math.round((examPts + gpaPts + achTotal) * 10) / 10)

    return { examPts, gpaPts, achTotal, total }
  }, [exam, gpa, scopus, oak, patent, innovFilial, innovRespublika, zakovat, spiritual, conf, other])

  const tier = getTier(result.total)

  return (
    <div className="student-tab-pane" id="student-tab-calculator" style={{ display: 'block' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0b3b70', marginBottom: 6 }}>Nizom baholash mezonlari aqlli kalkulyatori (13-14-modda)</h3>
        <p style={{ color: '#64748b', fontSize: 13.5, marginBottom: 22 }}>Ko'rsatkichlarni kiritib, yig'ma 100 ballik natijangizni jonli hisoblang.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 28 }}>
          <div style={{ color: '#334155' }}>
            <label>Sinov imtihoni bali (maks. 40)
              <input type="number" value={exam} min={0} max={40} step={1} onChange={(e) => setExam(parseFloat(e.target.value) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>O'rtacha GPA (maks. 5.0)
              <input type="number" value={gpa} min={3.0} max={5.0} step={0.01} onChange={(e) => setGpa(parseFloat(e.target.value) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Scopus / Web of Science maqolalar soni
              <input type="number" value={scopus} min={0} max={2} onChange={(e) => setScopus(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>OAK jurnal maqolalari soni
              <input type="number" value={oak} min={0} max={5} onChange={(e) => setOak(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Patent / DGU loyihalari soni
              <input type="number" value={patent} min={0} max={3} onChange={(e) => setPatent(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Ilmiy-innovatsion tanlov (filial miqyosi) soni
              <input type="number" value={innovFilial} min={0} max={1} onChange={(e) => setInnovFilial(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Ilmiy-innovatsion tanlov (respublika/xalqaro) soni
              <input type="number" value={innovRespublika} min={0} max={1} onChange={(e) => setInnovRespublika(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Intellektual o'yin / bilimlar tanlovi soni
              <input type="number" value={zakovat} min={0} max={5} onChange={(e) => setZakovat(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Ma'naviy-ma'rifiy tadbirlar soni
              <input type="number" value={spiritual} min={0} max={8} onChange={(e) => setSpiritual(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Konferensiya maqola/tezislari soni
              <input type="number" value={conf} min={0} max={2} onChange={(e) => setConf(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>Boshqa tasdiqlangan yutuqlar soni
              <input type="number" value={other} min={0} max={2} onChange={(e) => setOther(parseInt(e.target.value, 10) || 0)} style={numberFieldStyle} />
            </label>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #0b3b70 0%, #072950 100%)', borderRadius: 16, padding: 26, color: '#ffffff', textAlign: 'center', alignSelf: 'start' }}>
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>Umumiy natija</div>
            <div style={{ fontSize: 46, fontWeight: 800, margin: '8px 0', color: '#10b981' }}>{result.total.toFixed(1)}</div>
            <div style={{ background: tier.background, color: tier.color, border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: 20, padding: '6px 14px', display: 'inline-block', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              {tier.label}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>{tier.description}</div>

            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>Sinov imtihoni:</span>
                <span style={{ fontWeight: 700, color: '#ffffff', fontSize: 13.5 }}>{result.examPts.toFixed(1)} ball</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>GPA o'zlashtirish:</span>
                <span style={{ fontWeight: 700, color: '#ffffff', fontSize: 13.5 }}>{result.gpaPts.toFixed(1)} ball</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>Ilmiy-ijodiy yutuqlar:</span>
                <span style={{ fontWeight: 700, color: '#10b981', fontSize: 13.5 }}>{result.achTotal.toFixed(1)} ball</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
