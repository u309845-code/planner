import * as chrono from 'chrono-node'
import { TAGS } from './tags'
import type { Kind, NewTask } from './types'

/**
 * Быстрый ввод: «КП для Клиента-А до пт 15:00 #клиент ~1ч».
 * #тег — тег (достаточно начала слова), ~30м / ~1ч — план времени,
 * дата и время разбираются из текста («завтра в 12», «в пятницу»).
 */
export function parseQuick(input: string, kind: Kind, extraTags: string[] = []): NewTask {
  let text = input
  const tags = new Set(extraTags)

  text = text.replace(/#([\p{L}\d_-]+)/gu, (_m, word: string) => {
    const w = word.toLowerCase()
    const tag = TAGS.find((t) => t.id.startsWith(w))
    if (tag) tags.add(tag.id)
    return ' '
  })

  let plannedMin: number | null = null
  text = text.replace(
    /~\s*(\d+(?:[.,]\d+)?)\s*(ч(?:ас\p{L}*)?|м(?:ин\p{L}*)?)/iu,
    (_m, num: string, unit: string) => {
      const n = parseFloat(num.replace(',', '.'))
      plannedMin = Math.round(/^ч/i.test(unit) ? n * 60 : n)
      return ' '
    },
  )

  let dueAt: string | null = null
  if (kind === 'task') {
    const hit = chrono.ru.parse(text, new Date(), { forwardDate: true })[0]
    if (hit) {
      const date = hit.start.date()
      // срок без времени считаем концом рабочего дня
      if (!hit.start.isCertain('hour')) date.setHours(18, 0, 0, 0)
      dueAt = date.toISOString()
      const before = text.slice(0, hit.index).replace(/(?:до|на|к|в)\s*$/iu, '')
      // забираем и окончание слова («четверг» → «четверга»)
      const after = text.slice(hit.index + hit.text.length).replace(/^\p{L}+/u, '')
      text = before + ' ' + after
    }
  }

  const title = text.replace(/\s+/g, ' ').replace(/[\s.,;:\-–—]+$/, '').trim()
  return {
    title: title || input.trim(),
    kind,
    dueAt,
    tags: [...tags],
    plannedMin,
  }
}
