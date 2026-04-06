export const getTodayString = () => new Date().toISOString().slice(0, 10)

export const isOverdue = (dueDate: string, status: string) => {
  if (!dueDate) return false
  if (status === 'completed' || status === 'cancelled') return false
  return dueDate < getTodayString()
}

export const sortByDateDesc = <T>(items: T[], getDate: (item: T) => string) => {
  return [...items].sort((a, b) => (getDate(a) < getDate(b) ? 1 : -1))
}
