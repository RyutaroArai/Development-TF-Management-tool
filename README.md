# Development TF Management Tool

タスクフォース内で進める以下2種類の活動を、ローカルで一元管理するためのWebアプリです。

- 個別顧客案件
- 想定ニーズ・シーズ起点の探索プロジェクト

共通ステージは持たず、案件ごとに自由なマイルストーンで進捗管理します。さらに、現在の論点・次回アクション・滞留状況・仮説/提供価値の変更履歴を追えるようにしています。

## 技術構成

- React
- TypeScript
- Vite
- localStorage（初期版の永続化）

## 起動方法

```bash
npm install
npm run dev
```

ビルド確認:

```bash
npm run build
```

## 画面構成

### 1. 一覧画面

全案件・全探索プロジェクトを表形式で表示します。

表示項目:

- 名称
- 種別
- 主担当
- ステータス
- 現在の論点
- 次回アクション
- 次回アクション期限
- 滞留有無
- 最終更新日
- 追加情報
  - 個別顧客案件: 対象顧客名 / 現在の提供価値 / 想定収益
  - 探索プロジェクト: 現在のニーズ仮説 / 現在のシーズ仮説

絞り込み:

- 種別
- ステータス
- 滞留案件のみ
- 次回アクション期限超過のみ

### 2. 詳細画面

共通セクション:

- 基本情報
- 現在の論点
- 次回アクション
- 滞留情報
- マイルストーン一覧

個別顧客案件セクション:

- 案件概要
- 提供価値変更履歴
- アクション履歴
- 結果情報

探索プロジェクトセクション:

- 活動方針
- 仮説変更履歴
- 訪問先別アクション履歴
- 結果情報

### 3. 登録・編集画面

- プロジェクト種別に応じて入力項目を切り替え
- 必須項目に * を表示
- 保存時にバリデーションエラーを一覧表示
- 共通 / 種別 / 履歴 / マイルストーンでセクション分割

## データ構造

主要型は以下を定義しています。

- BaseProject
- CustomerProject
- DiscoveryProject
- Milestone
- ValuePropositionHistory
- HypothesisHistory
- CustomerAction
- DiscoveryAction

判別可能Union:

- Project = CustomerProject | DiscoveryProject
- projectType で分岐

定義ファイル:

- src/types.ts

## 必須表示ロジック

- currentValueProposition は、提供価値変更履歴の最新内容と整合
- currentNeedsHypothesis / currentSeedsHypothesis は、仮説変更履歴の最新内容と整合
- nextActionDueDate が今日より前かつ未完了の場合は期限超過表示
- マイルストーン status が delayed の場合は強調表示
- isStalled が true の案件は滞留として目立つ表示

## バリデーション

保存時に以下を検証し、違反時は保存不可です。

- 顧客アクション履歴: actionDate, purpose, result, detail, nextAction, nextActionDueDate, nextActionOwner 必須
- 提供価値変更履歴: changedAt, beforeValueProposition, afterValueProposition, reason, changedBy 必須
- 仮説変更履歴: changedAt, changeTarget, beforeContent, afterContent, reason, changedBy 必須
- status が completed の場合、結果情報（finalResult / finalReason）必須
- isStalled が true の場合、stallReason 必須
- マイルストーンは最低1件必須

## サンプルデータ

初期データとして以下を同梱しています。

- 個別顧客案件 2件
- 探索プロジェクト 2件

各レコードに以下を含みます。

- マイルストーン
- アクション履歴
- 提供価値変更履歴または仮説変更履歴
- 滞留案件（1件以上）
- 期限超過の次回アクション（1件以上）

データファイル:

- src/data/sampleData.ts

## フォルダ構成（主要）

```text
src/
  App.tsx
  types.ts
  data/
    sampleData.ts
  storage/
    projectStorage.ts
  utils/
    consistency.ts
    validation.ts
    date.ts
```

## 今後の拡張ポイント

- localStorage から DB への置き換え（API層を追加）
- 変更履歴の差分比較UI
- コメント/メモ機能
- 添付ファイル管理
- 権限管理（閲覧/編集の分離）
