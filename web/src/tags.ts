export interface TagDef {
  id: string
  label: string
  /** Классы целиком, чтобы Tailwind их увидел */
  chip: string
  dot: string
}

export const TAGS: TagDef[] = [
  {
    id: 'клиент',
    label: 'клиент',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  {
    id: 'проект',
    label: 'проект',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  {
    id: 'встреча',
    label: 'встреча',
    chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    dot: 'bg-cyan-500',
  },
  {
    id: 'внутр',
    label: 'внутр. встреча',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  {
    id: 'личное',
    label: 'личное',
    chip: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
]

export const tagById = (id: string): TagDef | undefined => TAGS.find((t) => t.id === id)
