import { sampleProjects } from '../data/sampleData'
import type { Project } from '../types'
import { syncProjectCurrentValues } from '../utils/consistency'

const STORAGE_KEY = 'tf-management-projects'

export const loadProjects = (): Project[] => {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    const synced = sampleProjects.map(syncProjectCurrentValues)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced))
    return synced
  }

  try {
    const parsed = JSON.parse(raw) as Project[]
    return parsed.map(syncProjectCurrentValues)
  } catch {
    const fallback = sampleProjects.map(syncProjectCurrentValues)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

export const saveProjects = (projects: Project[]) => {
  const synced = projects.map(syncProjectCurrentValues)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(synced))
}
