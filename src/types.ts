export type ProjectType = 'customerProject' | 'discoveryProject'
export type ProjectStatus = 'active' | 'onHold' | 'completed' | 'cancelled'

export interface Milestone {
  id: string
  title: string
  plannedDate: string
  actualDate?: string
  status: 'notStarted' | 'inProgress' | 'done' | 'delayed'
}

export interface ValuePropositionHistory {
  changedAt: string
  beforeValueProposition: string
  afterValueProposition: string
  reason: string
  changedBy: string
}

export interface HypothesisHistory {
  changedAt: string
  changeTarget: 'needs' | 'seeds' | 'both'
  beforeContent: string
  afterContent: string
  reason: string
  changedBy: string
}

export interface CustomerAction {
  actionDate: string
  purpose: string
  result: string
  detail: string
  nextAction: string
  nextActionDueDate: string
  nextActionOwner: string
}

export interface DiscoveryAction {
  actionDate: string
  targetName: string
  purpose: string
  result: string
  detail: string
  feedbackToHypothesis: string
  nextAction: string
  nextActionDueDate: string
  nextActionOwner: string
}

export interface BaseProject {
  id: string
  name: string
  projectType: ProjectType
  owner: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  currentIssue: string
  nextAction: string
  nextActionDueDate: string
  nextActionOwner: string
  isStalled: boolean
  stallReason?: string
  milestones: Milestone[]
}

export interface CustomerProject extends BaseProject {
  projectType: 'customerProject'
  customerName: string
  projectBackground: string
  customerNeedsAndIssues: string
  currentValueProposition: string
  expectedRevenue: string
  expansionPotential: string
  valuePropositionHistory: ValuePropositionHistory[]
  customerActions: CustomerAction[]
  finalResult?: 'won' | 'lost'
  finalReason?: string
}

export interface DiscoveryProject extends BaseProject {
  projectType: 'discoveryProject'
  currentNeedsHypothesis: string
  currentSeedsHypothesis: string
  activityPolicy: string
  visitTargets: string
  actionMilestones: string
  hypothesisHistory: HypothesisHistory[]
  discoveryActions: DiscoveryAction[]
  finalResult?: 'converted' | 'continue' | 'stopped'
  finalReason?: string
}

export type Project = CustomerProject | DiscoveryProject
