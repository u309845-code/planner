export type Cell = string | number | null

/** Защита от «формул» в Excel: ячейки, начинающиеся с = + @, превращаются в текст. */
function escapeCell(value: Cell): string {
  if (value === null) return ''
  let s = String(value)
  if (/^[=+@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV для русского Excel: разделитель «;», кодировка UTF-8 с BOM. */
export function toCsv(rows: Cell[][]): string {
  return '﻿' + rows.map((r) => r.map(escapeCell).join(';')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Минуты с одним знаком и запятой: 90 сек → «1,5» */
export function minutes(sec: number): string {
  return String(Math.round(sec / 6) / 10).replace('.', ',')
}

export function csvDate(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function csvDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${csvDate(d.getTime())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
