import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { Expense } from '../types'

export async function exportCalendarImage(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export async function exportCalendarPdf(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  })
  const img = new Image()
  img.src = dataUrl
  await new Promise((res, rej) => {
    img.onload = () => res(null)
    img.onerror = rej
  })
  const pdf = new jsPDF({
    orientation: img.width > img.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [img.width, img.height],
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height)
  pdf.save(filename)
}

export function exportExpensesCsv(expenses: Expense[], filename: string) {
  const header = 'label,category,amount_usd,date,currency\n'
  const rows = expenses
    .map(
      (e) =>
        `"${e.label.replace(/"/g, '""')}",${e.category},${(e.amountCents / 100).toFixed(2)},${e.spentOn ?? ''},${e.currency}`,
    )
    .join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
