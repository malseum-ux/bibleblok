// 예전 웹 데이터 가져오기 — 같은 계정으로 Supabase 에 저장해 두었던 설교·교재를 읽어 백업 형식(version 2)으로 만든다
// 플러터 앱 services/web_import.dart 와 같은 동작. 결과는 db.importAllData 에 그대로 넘긴다.
// Supabase 의 원본은 지우지 않는다.
import { supabase } from './supabase'

// 한 표 전체를 읽는다 — 한 번에 1000줄까지라 나눠서 읽는다
async function fetchAllRows(table) {
  const page = 1000
  const out = []
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + page - 1)
    if (error) throw error
    out.push(...data)
    if (data.length < page) break
  }
  return out
}

function map(rows, fields) {
  return rows.map(r => Object.fromEntries(Object.entries(fields).map(([from, to]) => [to, r[from] ?? null])))
}

export async function fetchCloudBackup() {
  const item = { id: 'id', date: 'date', title: 'title', passage: 'passage', draft: 'draft', folder_id: 'folderId', created_at: 'createdAt' }
  const [sermons, sermonSteps, worships, worshipSteps, dawns, dawnSteps, folders, cells, cellSteps, custom] = await Promise.all(
    ['sermons', 'sermon_steps', 'worships', 'worship_steps', 'dawns', 'dawn_steps', 'folders', 'cells', 'cell_steps', 'custom_step_items'].map(fetchAllRows)
  )
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      sermons: map(sermons, { ...item, category: 'category', emphasis: 'emphasis' }),
      sermonSteps: map(sermonSteps, { sermon_id: 'sermonId', step_index: 'stepIndex', content: 'content' }),
      worships: map(worships, { ...item, season: 'season' }),
      worshipSteps: map(worshipSteps, { worship_id: 'worshipId', step_index: 'stepIndex', content: 'content' }),
      dawns: map(dawns, { ...item, category: 'category', season: 'season', emphasis: 'emphasis' }),
      dawnSteps: map(dawnSteps, { dawn_id: 'dawnId', step_index: 'stepIndex', content: 'content' }),
      folders: map(folders, { id: 'id', tab: 'tab', name: 'name', parent_id: 'parentId', created_at: 'createdAt' }),
      cells: map(cells, { id: 'id', passage: 'passage', title: 'title', date: 'date', folder_id: 'folderId', created_at: 'createdAt' }),
      cellSteps: map(cellSteps, { cell_id: 'cellId', step_index: 'stepIndex', content: 'content', final_content: 'finalContent' }),
      customStepItems: map(custom, { id: 'id', tab: 'tab', step_key: 'stepKey', label: 'label', text: 'text', order: 'order' }),
      keywords: {},
    },
  }
}
