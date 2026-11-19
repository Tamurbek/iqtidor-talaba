// Sayt subpath ostida (masalan jbnuu.uz/iqtidorli-talaba/) ishlashi uchun yordamchilar.
// import.meta.env.BASE_URL vite.config.ts dagi `base` dan keladi va doim "/" bilan tugaydi.

/** Router basename: "/" yoki "/iqtidorli-talaba" (oxirida "/"siz). */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '')

/**
 * Ildizga nisbatan yo'lni (masalan "/static/images/logo.png" yoki backend qaytargan
 * "/static/uploads/news/x.png") subpath bilan to'liq yo'lga aylantiradi.
 * Tashqi URL'lar (http:, https:, data:, blob:) va bo'sh qiymat o'zgarishsiz qaytadi.
 */
export function withBase(path: string): string
export function withBase(path: string | null | undefined): string | undefined
export function withBase(path: string | null | undefined): string | undefined {
  if (!path) return path ?? undefined
  if (!path.startsWith('/') || path.startsWith('//')) return path
  if (BASE_PATH && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`))) return path
  return `${BASE_PATH}${path}`
}
