import { useEffect, useMemo, useState } from 'react'
import { loadProjects, saveProjects } from './storage/projectStorage'
import type {
  CustomerProject,
  DiscoveryProject,
  Milestone,
  Project,
  ProjectStatus,
  ProjectType,
} from './types'
import { syncProjectCurrentValues } from './utils/consistency'
import { getTodayString, isOverdue } from './utils/date'
import { validateProject } from './utils/validation'

type ScreenMode = 'list' | 'detail' | 'create' | 'edit'

interface Filters {
  projectType: 'all' | ProjectType
  status: 'all' | ProjectStatus
  stalledOnly: boolean
  overdueOnly: boolean
}

const createMilestone = (): Milestone => ({
  id: crypto.randomUUID(),
  title: '',
  plannedDate: '',
  actualDate: '',
  status: 'notStarted',
})

const createEmptyProject = (projectType: ProjectType): Project => {
  const base = {
    id: crypto.randomUUID(),
    name: '',
    owner: '',
    status: 'active' as ProjectStatus,
    createdAt: getTodayString(),
    updatedAt: getTodayString(),
    currentIssue: '',
    nextAction: '',
    nextActionDueDate: '',
    nextActionOwner: '',
    isStalled: false,
    stallReason: '',
    milestones: [createMilestone()],
  }

  if (projectType === 'customerProject') {
    const customerProject: CustomerProject = {
      ...base,
      projectType: 'customerProject',
      customerName: '',
      projectBackground: '',
      customerNeedsAndIssues: '',
      currentValueProposition: '',
      expectedRevenue: '',
      expansionPotential: '',
      valuePropositionHistory: [],
      customerActions: [],
      finalResult: undefined,
      finalReason: '',
    }
    return customerProject
  }

  const discoveryProject: DiscoveryProject = {
    ...base,
    projectType: 'discoveryProject',
    currentNeedsHypothesis: '',
    currentSeedsHypothesis: '',
    activityPolicy: '',
    visitTargets: '',
    actionMilestones: '',
    hypothesisHistory: [],
    discoveryActions: [],
    finalResult: undefined,
    finalReason: '',
  }
  return discoveryProject
}

const cloneProject = (project: Project): Project =>
  JSON.parse(JSON.stringify(project)) as Project

function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<ScreenMode>('list')
  const [createType, setCreateType] = useState<ProjectType>('customerProject')
  const [filters, setFilters] = useState<Filters>({
    projectType: 'all',
    status: 'all',
    stalledOnly: false,
    overdueOnly: false,
  })

  useEffect(() => {
    saveProjects(projects)
  }, [projects])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  )

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filters.projectType !== 'all' && project.projectType !== filters.projectType) {
        return false
      }

      if (filters.status !== 'all' && project.status !== filters.status) {
        return false
      }

      if (filters.stalledOnly && !project.isStalled) {
        return false
      }

      if (filters.overdueOnly && !isOverdue(project.nextActionDueDate, project.status)) {
        return false
      }

      return true
    })
  }, [filters, projects])

  const handleCreate = (type: ProjectType) => {
    setCreateType(type)
    setMode('create')
  }

  const handleSaveProject = (project: Project) => {
    const synced = syncProjectCurrentValues({
      ...project,
      updatedAt: getTodayString(),
    })

    if (mode === 'create') {
      setProjects((prev) => [synced, ...prev])
    } else {
      setProjects((prev) => prev.map((item) => (item.id === synced.id ? synced : item)))
    }

    setSelectedId(synced.id)
    setMode('detail')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>開発TF進捗一覧</h1>
        <p>
          現在の論点、次回アクション、滞留、仮説/提供価値の変遷を一元管理するローカルアプリ
        </p>
      </header>

      {mode === 'list' && (
        <>
          <section className="toolbar">
            <button onClick={() => handleCreate('customerProject')}>+ 個別顧客案件を作成</button>
            <button onClick={() => handleCreate('discoveryProject')}>+ 探索プロジェクトを作成</button>
          </section>

          <section className="panel">
            <h2>絞り込み</h2>
            <div className="filters">
              <label>
                種別
                <select
                  value={filters.projectType}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      projectType: event.target.value as Filters['projectType'],
                    }))
                  }
                >
                  <option value="all">すべて</option>
                  <option value="customerProject">個別顧客案件</option>
                  <option value="discoveryProject">探索プロジェクト</option>
                </select>
              </label>

              <label>
                ステータス
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: event.target.value as Filters['status'],
                    }))
                  }
                >
                  <option value="all">すべて</option>
                  <option value="active">active</option>
                  <option value="onHold">onHold</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={filters.stalledOnly}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, stalledOnly: event.target.checked }))
                  }
                />
                滞留のみ
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={filters.overdueOnly}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, overdueOnly: event.target.checked }))
                  }
                />
                次回アクション期限超過のみ
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>一覧</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>種別</th>
                    <th>主担当</th>
                    <th>ステータス</th>
                    <th>現在の論点</th>
                    <th>次回アクション</th>
                    <th>期限</th>
                    <th>滞留</th>
                    <th>最終更新日</th>
                    <th>追加情報</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const overdue = isOverdue(project.nextActionDueDate, project.status)

                    return (
                      <tr
                        key={project.id}
                        className={project.isStalled ? 'row-stalled' : undefined}
                      >
                        <td>{project.name}</td>
                        <td>
                          {project.projectType === 'customerProject'
                            ? '個別顧客案件'
                            : '探索プロジェクト'}
                        </td>
                        <td>{project.owner}</td>
                        <td>{project.status}</td>
                        <td>{project.currentIssue}</td>
                        <td>{project.nextAction}</td>
                        <td>
                          {project.nextActionDueDate}
                          {overdue && <span className="badge danger">期限超過</span>}
                        </td>
                        <td>
                          {project.isStalled ? (
                            <span className="badge warning">滞留中</span>
                          ) : (
                            'なし'
                          )}
                        </td>
                        <td>{project.updatedAt}</td>
                        <td>
                          {project.projectType === 'customerProject' ? (
                            <>
                              <div>顧客: {project.customerName}</div>
                              <div>提供価値: {project.currentValueProposition}</div>
                              <div>想定収益: {project.expectedRevenue}</div>
                            </>
                          ) : (
                            <>
                              <div>ニーズ仮説: {project.currentNeedsHypothesis}</div>
                              <div>シーズ仮説: {project.currentSeedsHypothesis}</div>
                            </>
                          )}
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => {
                              setSelectedId(project.id)
                              setMode('detail')
                            }}
                          >
                            詳細
                          </button>
                          <button
                            className="text-button"
                            onClick={() => {
                              setSelectedId(project.id)
                              setMode('edit')
                            }}
                          >
                            編集
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {mode === 'detail' && selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onBack={() => setMode('list')}
          onEdit={() => setMode('edit')}
        />
      )}

      {mode === 'create' && (
        <ProjectForm
          initialProject={createEmptyProject(createType)}
          mode="create"
          onCancel={() => setMode('list')}
          onSave={handleSaveProject}
        />
      )}

      {mode === 'edit' && selectedProject && (
        <ProjectForm
          initialProject={cloneProject(selectedProject)}
          mode="edit"
          onCancel={() => setMode('detail')}
          onSave={handleSaveProject}
        />
      )}
    </main>
  )
}

interface ProjectDetailProps {
  project: Project
  onBack: () => void
  onEdit: () => void
}

function ProjectDetail({ project, onBack, onEdit }: ProjectDetailProps) {
  const overdue = isOverdue(project.nextActionDueDate, project.status)

  return (
    <section className="panel">
      <div className="section-actions">
        <button onClick={onBack}>一覧へ戻る</button>
        <button onClick={onEdit}>編集する</button>
      </div>

      <h2>{project.name}</h2>
      {project.isStalled && <p className="highlight-alert">滞留中: {project.stallReason}</p>}

      <h3>共通セクション</h3>
      <div className="grid-two">
        <Info
          label="種別"
          value={
            project.projectType === 'customerProject' ? '個別顧客案件' : '探索プロジェクト'
          }
        />
        <Info label="ステータス" value={project.status} />
        <Info label="主担当" value={project.owner} />
        <Info label="最終更新日" value={project.updatedAt} />
        <Info label="現在の論点" value={project.currentIssue} />
        <Info label="次回アクション" value={project.nextAction} />
        <Info
          label="次回アクション期限"
          value={`${project.nextActionDueDate}${overdue ? ' (期限超過)' : ''}`}
        />
        <Info label="次回アクション担当" value={project.nextActionOwner} />
      </div>

      <h3>滞留情報</h3>
      <Info label="滞留有無" value={project.isStalled ? 'あり' : 'なし'} />
      {project.isStalled && <Info label="滞留理由" value={project.stallReason ?? ''} />}

      <h3>マイルストーン一覧</h3>
      <ul className="list-cards">
        {project.milestones.map((milestone) => (
          <li key={milestone.id} className={milestone.status === 'delayed' ? 'delayed-card' : ''}>
            <strong>{milestone.title}</strong>
            <div>計画: {milestone.plannedDate}</div>
            <div>実績: {milestone.actualDate || '-'}</div>
            <div>状態: {milestone.status}</div>
          </li>
        ))}
      </ul>

      {project.projectType === 'customerProject' ? (
        <>
          <h3>個別顧客案件セクション</h3>
          <div className="grid-two">
            <Info label="対象顧客名" value={project.customerName} />
            <Info label="想定収益" value={project.expectedRevenue} />
            <Info label="案件概要" value={project.projectBackground} />
            <Info label="顧客ニーズ/課題" value={project.customerNeedsAndIssues} />
            <Info label="現在の提供価値" value={project.currentValueProposition} />
            <Info label="展開可能性" value={project.expansionPotential} />
          </div>

          <h3>提供価値変更履歴</h3>
          <ul className="list-cards">
            {project.valuePropositionHistory.map((item, index) => (
              <li key={`${item.changedAt}-${index}`}>
                <div>変更日: {item.changedAt}</div>
                <div>変更前: {item.beforeValueProposition}</div>
                <div>変更後: {item.afterValueProposition}</div>
                <div>理由: {item.reason}</div>
                <div>変更者: {item.changedBy}</div>
              </li>
            ))}
          </ul>

          <h3>アクション履歴</h3>
          <ul className="list-cards">
            {project.customerActions.map((item, index) => (
              <li key={`${item.actionDate}-${index}`}>
                <div>実施日: {item.actionDate}</div>
                <div>目的: {item.purpose}</div>
                <div>結果: {item.result}</div>
                <div className="detail-text"><span className="detail-label-text">詳細: </span>{item.detail}</div>
                <div>次回: {item.nextAction}</div>
                <div>期限: {item.nextActionDueDate}</div>
                <div>担当: {item.nextActionOwner}</div>
              </li>
            ))}
          </ul>

          <h3>結果情報</h3>
          <Info label="最終結果" value={project.finalResult ?? '-'} />
          <Info label="最終理由" value={project.finalReason ?? '-'} />
        </>
      ) : (
        <>
          <h3>探索プロジェクトセクション</h3>
          <div className="grid-two">
            <Info label="活動方針" value={project.activityPolicy} />
            <Info label="訪問ターゲット" value={project.visitTargets} />
            <Info label="活動マイルストーン" value={project.actionMilestones} />
            <Info label="現在のニーズ仮説" value={project.currentNeedsHypothesis} />
            <Info label="現在のシーズ仮説" value={project.currentSeedsHypothesis} />
          </div>

          <h3>仮説変更履歴</h3>
          <ul className="list-cards">
            {project.hypothesisHistory.map((item, index) => (
              <li key={`${item.changedAt}-${index}`}>
                <div>変更日: {item.changedAt}</div>
                <div>対象: {item.changeTarget}</div>
                <div>変更前: {item.beforeContent}</div>
                <div>変更後: {item.afterContent}</div>
                <div>理由: {item.reason}</div>
                <div>変更者: {item.changedBy}</div>
              </li>
            ))}
          </ul>

          <h3>訪問先別アクション履歴</h3>
          <ul className="list-cards">
            {project.discoveryActions.map((item, index) => (
              <li key={`${item.actionDate}-${index}`}>
                <div>実施日: {item.actionDate}</div>
                <div>訪問先: {item.targetName}</div>
                <div>目的: {item.purpose}</div>
                <div>結果: {item.result}</div>
                <div className="detail-text"><span className="detail-label-text">詳細: </span>{item.detail}</div>
                <div>仮説への反映: {item.feedbackToHypothesis}</div>
                <div>次回: {item.nextAction}</div>
                <div>期限: {item.nextActionDueDate}</div>
                <div>担当: {item.nextActionOwner}</div>
              </li>
            ))}
          </ul>

          <h3>結果情報</h3>
          <Info label="最終結果" value={project.finalResult ?? '-'} />
          <Info label="最終理由" value={project.finalReason ?? '-'} />
        </>
      )}
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  )
}

interface ProjectFormProps {
  initialProject: Project
  mode: 'create' | 'edit'
  onCancel: () => void
  onSave: (project: Project) => void
}

function ProjectForm({ initialProject, mode, onCancel, onSave }: ProjectFormProps) {
  const [draft, setDraft] = useState<Project>(initialProject)
  const [errors, setErrors] = useState<string[]>([])

  const setCommon = (key: keyof Project, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }) as Project)
  }

  const updateMilestone = (index: number, key: keyof Milestone, value: string) => {
    setDraft((prev) => {
      const milestones = prev.milestones.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      )
      return { ...prev, milestones }
    })
  }

  const addMilestone = () =>
    setDraft((prev) => ({ ...prev, milestones: [...prev.milestones, createMilestone()] }))

  const removeMilestone = (index: number) =>
    setDraft((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    const synced = syncProjectCurrentValues({
      ...draft,
      updatedAt: getTodayString(),
      createdAt: mode === 'create' ? getTodayString() : draft.createdAt,
    })
    const validationErrors = validateProject(synced)

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])
    onSave(synced)
  }

  const customer = draft.projectType === 'customerProject' ? draft : null
  const discovery = draft.projectType === 'discoveryProject' ? draft : null

  return (
    <section className="panel">
      <div className="section-actions">
        <button onClick={onCancel} type="button">
          戻る
        </button>
      </div>

      <h2>{mode === 'create' ? '新規登録' : '編集'}</h2>
      <form onSubmit={submit} className="form-layout">
        {errors.length > 0 && (
          <div className="error-box">
            <strong>保存できません。必須項目を確認してください。</strong>
            <ul>
              {errors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <h3>共通セクション</h3>
        <div className="grid-two">
          <label>
            名称 *
            <input value={draft.name} onChange={(e) => setCommon('name', e.target.value)} />
          </label>
          <label>
            種別
            <input
              disabled
              value={
                draft.projectType === 'customerProject'
                  ? '個別顧客案件'
                  : '探索プロジェクト'
              }
            />
          </label>
          <label>
            主担当 *
            <input value={draft.owner} onChange={(e) => setCommon('owner', e.target.value)} />
          </label>
          <label>
            ステータス *
            <select
              value={draft.status}
              onChange={(e) => setCommon('status', e.target.value as ProjectStatus)}
            >
              <option value="active">active</option>
              <option value="onHold">onHold</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label>
            現在の論点 *
            <textarea
              value={draft.currentIssue}
              onChange={(e) => setCommon('currentIssue', e.target.value)}
            />
          </label>
          <label>
            次回アクション *
            <textarea
              value={draft.nextAction}
              onChange={(e) => setCommon('nextAction', e.target.value)}
            />
          </label>
          <label>
            次回アクション期限 *
            <input
              type="date"
              value={draft.nextActionDueDate}
              onChange={(e) => setCommon('nextActionDueDate', e.target.value)}
            />
          </label>
          <label>
            次回アクション担当 *
            <input
              value={draft.nextActionOwner}
              onChange={(e) => setCommon('nextActionOwner', e.target.value)}
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={draft.isStalled}
              onChange={(e) => setCommon('isStalled', e.target.checked)}
            />
            滞留中
          </label>
          {draft.isStalled && (
            <label>
              滞留理由 *
              <textarea
                value={draft.stallReason || ''}
                onChange={(e) => setCommon('stallReason', e.target.value)}
              />
            </label>
          )}
        </div>

        <h3>マイルストーン一覧 *</h3>
        {draft.milestones.map((milestone, index) => (
          <div className="inline-card" key={milestone.id}>
            <label>
              タイトル *
              <input
                value={milestone.title}
                onChange={(e) => updateMilestone(index, 'title', e.target.value)}
              />
            </label>
            <label>
              計画日 *
              <input
                type="date"
                value={milestone.plannedDate}
                onChange={(e) => updateMilestone(index, 'plannedDate', e.target.value)}
              />
            </label>
            <label>
              実績日
              <input
                type="date"
                value={milestone.actualDate || ''}
                onChange={(e) => updateMilestone(index, 'actualDate', e.target.value)}
              />
            </label>
            <label>
              状態 *
              <select
                value={milestone.status}
                onChange={(e) => updateMilestone(index, 'status', e.target.value)}
              >
                <option value="notStarted">notStarted</option>
                <option value="inProgress">inProgress</option>
                <option value="done">done</option>
                <option value="delayed">delayed</option>
              </select>
            </label>
            <button type="button" onClick={() => removeMilestone(index)}>
              削除
            </button>
          </div>
        ))}
        <button type="button" onClick={addMilestone}>
          + マイルストーン追加
        </button>

        {customer && (
          <>
            <h3>個別顧客案件セクション</h3>
            <div className="grid-two">
              <label>
                対象顧客名 *
                <input
                  value={customer.customerName}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      customerName: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                想定収益
                <input
                  value={customer.expectedRevenue}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      expectedRevenue: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                案件概要 *
                <textarea
                  value={customer.projectBackground}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      projectBackground: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                顧客ニーズ/課題 *
                <textarea
                  value={customer.customerNeedsAndIssues}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      customerNeedsAndIssues: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                現在の提供価値 *
                <textarea
                  value={customer.currentValueProposition}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      currentValueProposition: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                展開可能性
                <textarea
                  value={customer.expansionPotential}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      expansionPotential: e.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <h3>提供価値変更履歴</h3>
            {customer.valuePropositionHistory.map((item, index) => (
              <div className="inline-card" key={`${item.changedAt}-${index}`}>
                <label>
                  変更日 *
                  <input
                    type="date"
                    value={item.changedAt}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).valuePropositionHistory]
                        rows[index] = { ...rows[index], changedAt: e.target.value }
                        return { ...(prev as CustomerProject), valuePropositionHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更前の提供価値 *
                  <input
                    value={item.beforeValueProposition}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).valuePropositionHistory]
                        rows[index] = { ...rows[index], beforeValueProposition: e.target.value }
                        return { ...(prev as CustomerProject), valuePropositionHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更後の提供価値 *
                  <input
                    value={item.afterValueProposition}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).valuePropositionHistory]
                        rows[index] = { ...rows[index], afterValueProposition: e.target.value }
                        return { ...(prev as CustomerProject), valuePropositionHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更理由 *
                  <input
                    value={item.reason}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).valuePropositionHistory]
                        rows[index] = { ...rows[index], reason: e.target.value }
                        return { ...(prev as CustomerProject), valuePropositionHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更者 *
                  <input
                    value={item.changedBy}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).valuePropositionHistory]
                        rows[index] = { ...rows[index], changedBy: e.target.value }
                        return { ...(prev as CustomerProject), valuePropositionHistory: rows }
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      valuePropositionHistory: (prev as CustomerProject).valuePropositionHistory.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  削除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...(prev as CustomerProject),
                  valuePropositionHistory: [
                    ...(prev as CustomerProject).valuePropositionHistory,
                    {
                      changedAt: '',
                      beforeValueProposition: '',
                      afterValueProposition: '',
                      reason: '',
                      changedBy: '',
                    },
                  ],
                }))
              }
            >
              + 提供価値変更履歴追加
            </button>

            <h3>アクション履歴</h3>
            {customer.customerActions.map((item, index) => (
              <div className="inline-card" key={`${item.actionDate}-${index}`}>
                <label>
                  実施日 *
                  <input
                    type="date"
                    value={item.actionDate}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).customerActions]
                        rows[index] = { ...rows[index], actionDate: e.target.value }
                        return { ...(prev as CustomerProject), customerActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  目的 *
                  <input
                    value={item.purpose}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).customerActions]
                        rows[index] = { ...rows[index], purpose: e.target.value }
                        return { ...(prev as CustomerProject), customerActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  結果 *
                  <input
                    value={item.result}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).customerActions]
                        rows[index] = { ...rows[index], result: e.target.value }
                        return { ...(prev as CustomerProject), customerActions: rows }
                      })
                    }
                  />
                </label>
                <label className="detail-label">
                  詳細 *
                  <textarea
                    rows={5}
                    placeholder="訪問内容・会話の要点・課題感などを具体的に記載してください"
                    value={item.detail}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).customerActions]
                        rows[index] = { ...rows[index], detail: e.target.value }
                        return { ...(prev as CustomerProject), customerActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  次回アクション *
                  <input
                    value={item.nextAction}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).customerActions]
                        rows[index] = { ...rows[index], nextAction: e.target.value }
                        return { ...(prev as CustomerProject), customerActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  次回アクション期限 *
                  <input
                    type="date"
                    value={item.nextActionDueDate}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).customerActions]
                        rows[index] = { ...rows[index], nextActionDueDate: e.target.value }
                        return { ...(prev as CustomerProject), customerActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  次回アクション担当 *
                  <input
                    value={item.nextActionOwner}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as CustomerProject).customerActions]
                        rows[index] = { ...rows[index], nextActionOwner: e.target.value }
                        return { ...(prev as CustomerProject), customerActions: rows }
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...(prev as CustomerProject),
                      customerActions: (prev as CustomerProject).customerActions.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  削除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...(prev as CustomerProject),
                  customerActions: [
                    ...(prev as CustomerProject).customerActions,
                    {
                      actionDate: '',
                      purpose: '',
                      result: '',
                      detail: '',
                      nextAction: '',
                      nextActionDueDate: '',
                      nextActionOwner: '',
                    },
                  ],
                }))
              }
            >
              + アクション履歴追加
            </button>

            {customer.status === 'completed' && (
              <div className="grid-two">
                <label>
                  最終結果 *
                  <select
                    value={customer.finalResult || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...(prev as CustomerProject),
                        finalResult: e.target.value as CustomerProject['finalResult'],
                      }))
                    }
                  >
                    <option value="">選択してください</option>
                    <option value="won">受注</option>
                    <option value="lost">失注</option>
                  </select>
                </label>
                <label>
                  最終理由 *
                  <textarea
                    value={customer.finalReason || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...(prev as CustomerProject),
                        finalReason: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            )}
          </>
        )}

        {discovery && (
          <>
            <h3>探索プロジェクトセクション</h3>
            <div className="grid-two">
              <label>
                現在のニーズ仮説 *
                <textarea
                  value={discovery.currentNeedsHypothesis}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as DiscoveryProject),
                      currentNeedsHypothesis: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                現在のシーズ仮説 *
                <textarea
                  value={discovery.currentSeedsHypothesis}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as DiscoveryProject),
                      currentSeedsHypothesis: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                活動方針 *
                <textarea
                  value={discovery.activityPolicy}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as DiscoveryProject),
                      activityPolicy: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                訪問ターゲット *
                <textarea
                  value={discovery.visitTargets}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as DiscoveryProject),
                      visitTargets: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                活動マイルストーン *
                <textarea
                  value={discovery.actionMilestones}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev as DiscoveryProject),
                      actionMilestones: e.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <h3>仮説変更履歴</h3>
            {discovery.hypothesisHistory.map((item, index) => (
              <div className="inline-card" key={`${item.changedAt}-${index}`}>
                <label>
                  変更日 *
                  <input
                    type="date"
                    value={item.changedAt}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).hypothesisHistory]
                        rows[index] = { ...rows[index], changedAt: e.target.value }
                        return { ...(prev as DiscoveryProject), hypothesisHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更対象 *
                  <select
                    value={item.changeTarget}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).hypothesisHistory]
                        rows[index] = { ...rows[index], changeTarget: e.target.value as 'needs' | 'seeds' | 'both' }
                        return { ...(prev as DiscoveryProject), hypothesisHistory: rows }
                      })
                    }
                  >
                    <option value="needs">ニーズ</option>
                    <option value="seeds">シーズ</option>
                    <option value="both">両方</option>
                  </select>
                </label>
                <label>
                  変更前内容 *
                  <input
                    value={item.beforeContent}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).hypothesisHistory]
                        rows[index] = { ...rows[index], beforeContent: e.target.value }
                        return { ...(prev as DiscoveryProject), hypothesisHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更後内容 *
                  <input
                    value={item.afterContent}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).hypothesisHistory]
                        rows[index] = { ...rows[index], afterContent: e.target.value }
                        return { ...(prev as DiscoveryProject), hypothesisHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更理由 *
                  <input
                    value={item.reason}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).hypothesisHistory]
                        rows[index] = { ...rows[index], reason: e.target.value }
                        return { ...(prev as DiscoveryProject), hypothesisHistory: rows }
                      })
                    }
                  />
                </label>
                <label>
                  変更者 *
                  <input
                    value={item.changedBy}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).hypothesisHistory]
                        rows[index] = { ...rows[index], changedBy: e.target.value }
                        return { ...(prev as DiscoveryProject), hypothesisHistory: rows }
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...(prev as DiscoveryProject),
                      hypothesisHistory: (prev as DiscoveryProject).hypothesisHistory.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  削除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...(prev as DiscoveryProject),
                  hypothesisHistory: [
                    ...(prev as DiscoveryProject).hypothesisHistory,
                    {
                      changedAt: '',
                      changeTarget: 'needs',
                      beforeContent: '',
                      afterContent: '',
                      reason: '',
                      changedBy: '',
                    },
                  ],
                }))
              }
            >
              + 仮説変更履歴追加
            </button>

            <h3>訪問先別アクション履歴</h3>
            {discovery.discoveryActions.map((item, index) => (
              <div className="inline-card" key={`${item.actionDate}-${index}`}>
                <label>
                  実施日 *
                  <input
                    type="date"
                    value={item.actionDate}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], actionDate: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  訪問先
                  <input
                    value={item.targetName}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], targetName: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  目的 *
                  <input
                    value={item.purpose}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], purpose: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  結果 *
                  <input
                    value={item.result}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], result: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label className="detail-label">
                  詳細 *
                  <textarea
                    rows={5}
                    placeholder="訪問内容・会話の要点・課題感などを具体的に記載してください"
                    value={item.detail}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], detail: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  仮説への反映
                  <input
                    value={item.feedbackToHypothesis}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], feedbackToHypothesis: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  次回アクション *
                  <input
                    value={item.nextAction}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], nextAction: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  次回アクション期限 *
                  <input
                    type="date"
                    value={item.nextActionDueDate}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], nextActionDueDate: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <label>
                  次回アクション担当 *
                  <input
                    value={item.nextActionOwner}
                    onChange={(e) =>
                      setDraft((prev) => {
                        const rows = [...(prev as DiscoveryProject).discoveryActions]
                        rows[index] = { ...rows[index], nextActionOwner: e.target.value }
                        return { ...(prev as DiscoveryProject), discoveryActions: rows }
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...(prev as DiscoveryProject),
                      discoveryActions: (prev as DiscoveryProject).discoveryActions.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  削除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...(prev as DiscoveryProject),
                  discoveryActions: [
                    ...(prev as DiscoveryProject).discoveryActions,
                    {
                      actionDate: '',
                      targetName: '',
                      purpose: '',
                      result: '',
                      detail: '',
                      feedbackToHypothesis: '',
                      nextAction: '',
                      nextActionDueDate: '',
                      nextActionOwner: '',
                    },
                  ],
                }))
              }
            >
              + 訪問先別アクション履歴追加
            </button>

            {discovery.status === 'completed' && (
              <div className="grid-two">
                <label>
                  最終結果 *
                  <select
                    value={discovery.finalResult || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...(prev as DiscoveryProject),
                        finalResult: e.target.value as DiscoveryProject['finalResult'],
                      }))
                    }
                  >
                    <option value="">選択してください</option>
                    <option value="converted">案件化</option>
                    <option value="continue">継続</option>
                    <option value="stopped">停止</option>
                  </select>
                </label>
                <label>
                  最終理由 *
                  <textarea
                    value={discovery.finalReason || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...(prev as DiscoveryProject),
                        finalReason: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            )}
          </>
        )}

        <div className="section-actions">
          <button type="submit">保存</button>
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </form>
    </section>
  )
}

export default App
