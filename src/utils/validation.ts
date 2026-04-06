import type {
  CustomerAction,
  CustomerProject,
  DiscoveryAction,
  DiscoveryProject,
  HypothesisHistory,
  Milestone,
  Project,
  ValuePropositionHistory,
} from '../types'

const isBlank = (value: string | undefined) => !value || value.trim() === ''

const validateMilestone = (milestone: Milestone, index: number) => {
  const errors: string[] = []

  if (isBlank(milestone.id)) errors.push(`マイルストーン${index + 1}: 識別子は必須です`)
  if (isBlank(milestone.title)) errors.push(`マイルストーン${index + 1}: タイトルは必須です`)
  if (isBlank(milestone.plannedDate))
    errors.push(`マイルストーン${index + 1}: 計画日は必須です`)
  if (isBlank(milestone.status)) errors.push(`マイルストーン${index + 1}: 状態は必須です`)

  return errors
}

const validateCustomerAction = (action: CustomerAction, index: number) => {
  const errors: string[] = []
  if (isBlank(action.actionDate)) errors.push(`顧客アクション${index + 1}: 実施日は必須です`)
  if (isBlank(action.purpose)) errors.push(`顧客アクション${index + 1}: 目的は必須です`)
  if (isBlank(action.result)) errors.push(`顧客アクション${index + 1}: 結果は必須です`)
  if (isBlank(action.detail)) errors.push(`顧客アクション${index + 1}: 詳細は必須です`)
  if (isBlank(action.nextAction))
    errors.push(`顧客アクション${index + 1}: 次回アクションは必須です`)
  if (isBlank(action.nextActionDueDate))
    errors.push(`顧客アクション${index + 1}: 次回アクション期限は必須です`)
  if (isBlank(action.nextActionOwner))
    errors.push(`顧客アクション${index + 1}: 次回アクション担当は必須です`)
  return errors
}

const validateDiscoveryAction = (action: DiscoveryAction, index: number) => {
  const errors: string[] = []
  if (isBlank(action.actionDate)) errors.push(`探索アクション${index + 1}: 実施日は必須です`)
  if (isBlank(action.purpose)) errors.push(`探索アクション${index + 1}: 目的は必須です`)
  if (isBlank(action.result)) errors.push(`探索アクション${index + 1}: 結果は必須です`)
  if (isBlank(action.detail)) errors.push(`探索アクション${index + 1}: 詳細は必須です`)
  if (isBlank(action.nextAction))
    errors.push(`探索アクション${index + 1}: 次回アクションは必須です`)
  if (isBlank(action.nextActionDueDate))
    errors.push(`探索アクション${index + 1}: 次回アクション期限は必須です`)
  if (isBlank(action.nextActionOwner))
    errors.push(`探索アクション${index + 1}: 次回アクション担当は必須です`)
  return errors
}

const validateValueHistory = (item: ValuePropositionHistory, index: number) => {
  const errors: string[] = []
  if (isBlank(item.changedAt)) errors.push(`提供価値履歴${index + 1}: 変更日は必須です`)
  if (isBlank(item.beforeValueProposition))
    errors.push(`提供価値履歴${index + 1}: 変更前の提供価値は必須です`)
  if (isBlank(item.afterValueProposition))
    errors.push(`提供価値履歴${index + 1}: 変更後の提供価値は必須です`)
  if (isBlank(item.reason)) errors.push(`提供価値履歴${index + 1}: 変更理由は必須です`)
  if (isBlank(item.changedBy)) errors.push(`提供価値履歴${index + 1}: 変更者は必須です`)
  return errors
}

const validateHypothesisHistory = (item: HypothesisHistory, index: number) => {
  const errors: string[] = []
  if (isBlank(item.changedAt)) errors.push(`仮説履歴${index + 1}: 変更日は必須です`)
  if (isBlank(item.changeTarget)) errors.push(`仮説履歴${index + 1}: 変更対象は必須です`)
  if (isBlank(item.beforeContent)) errors.push(`仮説履歴${index + 1}: 変更前内容は必須です`)
  if (isBlank(item.afterContent)) errors.push(`仮説履歴${index + 1}: 変更後内容は必須です`)
  if (isBlank(item.reason)) errors.push(`仮説履歴${index + 1}: 変更理由は必須です`)
  if (isBlank(item.changedBy)) errors.push(`仮説履歴${index + 1}: 変更者は必須です`)
  return errors
}

const validateCommon = (project: Project) => {
  const errors: string[] = []

  if (isBlank(project.name)) errors.push('名称は必須です')
  if (isBlank(project.owner)) errors.push('主担当は必須です')
  if (isBlank(project.currentIssue)) errors.push('現在の論点は必須です')
  if (isBlank(project.nextAction)) errors.push('次回アクションは必須です')
  if (isBlank(project.nextActionDueDate)) errors.push('次回アクション期限は必須です')
  if (isBlank(project.nextActionOwner)) errors.push('次回アクション担当は必須です')

  if (project.isStalled && isBlank(project.stallReason)) {
    errors.push('滞留中の場合、滞留理由は必須です')
  }

  if (project.milestones.length < 1) {
    errors.push('マイルストーンは最低1件必要です')
  }

  project.milestones.forEach((milestone, index) => {
    errors.push(...validateMilestone(milestone, index))
  })

  return errors
}

const validateCustomerProject = (project: CustomerProject) => {
  const errors: string[] = []

  if (isBlank(project.customerName)) errors.push('対象顧客名は必須です')
  if (isBlank(project.projectBackground)) errors.push('案件概要は必須です')
  if (isBlank(project.customerNeedsAndIssues))
    errors.push('顧客ニーズ/課題は必須です')
  if (isBlank(project.currentValueProposition))
    errors.push('現在の提供価値は必須です')

  project.valuePropositionHistory.forEach((item, index) => {
    errors.push(...validateValueHistory(item, index))
  })

  project.customerActions.forEach((item, index) => {
    errors.push(...validateCustomerAction(item, index))
  })

  if (project.status === 'completed') {
    if (isBlank(project.finalResult)) errors.push('完了時は最終結果が必須です')
    if (isBlank(project.finalReason)) errors.push('完了時は最終理由が必須です')
  }

  return errors
}

const validateDiscoveryProject = (project: DiscoveryProject) => {
  const errors: string[] = []

  if (isBlank(project.currentNeedsHypothesis)) errors.push('現在のニーズ仮説は必須です')
  if (isBlank(project.currentSeedsHypothesis)) errors.push('現在のシーズ仮説は必須です')
  if (isBlank(project.activityPolicy)) errors.push('活動方針は必須です')
  if (isBlank(project.visitTargets)) errors.push('訪問ターゲットは必須です')
  if (isBlank(project.actionMilestones)) errors.push('活動マイルストーンは必須です')

  project.hypothesisHistory.forEach((item, index) => {
    errors.push(...validateHypothesisHistory(item, index))
  })

  project.discoveryActions.forEach((item, index) => {
    errors.push(...validateDiscoveryAction(item, index))
  })

  if (project.status === 'completed') {
    if (isBlank(project.finalResult)) errors.push('完了時は最終結果が必須です')
    if (isBlank(project.finalReason)) errors.push('完了時は最終理由が必須です')
  }

  return errors
}

export const validateProject = (project: Project) => {
  const commonErrors = validateCommon(project)
  const specificErrors =
    project.projectType === 'customerProject'
      ? validateCustomerProject(project)
      : validateDiscoveryProject(project)

  return [...commonErrors, ...specificErrors]
}
