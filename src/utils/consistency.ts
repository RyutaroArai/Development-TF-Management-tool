import type { CustomerProject, DiscoveryProject, Project } from '../types'
import { sortByDateDesc } from './date'

const syncCustomerProject = (project: CustomerProject): CustomerProject => {
  if (project.valuePropositionHistory.length === 0) return project

  const latest = sortByDateDesc(
    project.valuePropositionHistory,
    (item) => item.changedAt,
  )[0]

  return {
    ...project,
    currentValueProposition: latest.afterValueProposition,
  }
}

const syncDiscoveryProject = (project: DiscoveryProject): DiscoveryProject => {
  if (project.hypothesisHistory.length === 0) return project

  const latest = sortByDateDesc(project.hypothesisHistory, (item) => item.changedAt)[0]
  const [needsFromHistory = project.currentNeedsHypothesis, seedsFromHistory = project.currentSeedsHypothesis] =
    latest.afterContent.includes('needs:') && latest.afterContent.includes('/ seeds:')
      ? latest.afterContent
          .replace('needs:', '')
          .split('/ seeds:')
          .map((part) => part.trim())
      : [project.currentNeedsHypothesis, project.currentSeedsHypothesis]

  if (latest.changeTarget === 'needs') {
    return {
      ...project,
      currentNeedsHypothesis: latest.afterContent,
    }
  }

  if (latest.changeTarget === 'seeds') {
    return {
      ...project,
      currentSeedsHypothesis: latest.afterContent,
    }
  }

  return {
    ...project,
    currentNeedsHypothesis: needsFromHistory,
    currentSeedsHypothesis: seedsFromHistory,
  }
}

export const syncProjectCurrentValues = (project: Project): Project => {
  if (project.projectType === 'customerProject') {
    return syncCustomerProject(project)
  }

  return syncDiscoveryProject(project)
}
