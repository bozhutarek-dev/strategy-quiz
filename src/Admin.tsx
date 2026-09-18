import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { GITHUB_TOKEN, RESULTS_REPO } from '@/config'
import { questions } from '@/data/questions'

interface AnswerRecord {
  id: number
  choice: number
  correct: boolean
}

interface ResultRecord {
  name: string
  group?: number
  score: number
  total: number
  percent: number
  submittedAt: string
  answers: AnswerRecord[]
}

const API = `https://api.github.com/repos/${RESULTS_REPO}`
const HEADERS: HeadersInit = {
  Accept: 'application/vnd.github+json',
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
}

function decodeContent(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

export default function Admin() {
  const [records, setRecords] = useState<ResultRecord[]>([])
  const [status, setStatus] = useState('正在加载…')
  const [lastRefresh, setLastRefresh] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const cache = useRef(new Map<string, { sha: string; record: ResultRecord }>())

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`${API}/contents/results`, { headers: HEADERS })
      if (res.status === 404) {
        cache.current.clear()
        setRecords([])
        setStatus('暂无提交，等待学员作答…')
        setLastRefresh(new Date().toLocaleTimeString())
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const items: { name: string; sha: string; url: string }[] = await res.json()
      const jsonItems = items.filter((i) => i.name.endsWith('.json'))

      // 清理已删除的文件
      const currentNames = new Set(jsonItems.map((i) => i.name))
      for (const key of Array.from(cache.current.keys())) {
        if (!currentNames.has(key)) cache.current.delete(key)
      }

      // 只拉取新增或变化的文件
      for (const item of jsonItems) {
        const cached = cache.current.get(item.name)
        if (cached && cached.sha === item.sha) continue
        const f = await fetch(item.url, { headers: HEADERS })
        if (!f.ok) continue
        const data = await f.json()
        const record = JSON.parse(decodeContent(data.content)) as ResultRecord
        cache.current.set(item.name, { sha: item.sha, record })
      }

      const all = Array.from(cache.current.values()).map((v) => v.record)
      all.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
      setRecords(all)
      setStatus('')
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (e) {
      setStatus(`刷新失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const count = records.length
  const avg = count ? Math.round(records.reduce((s, r) => s + r.percent, 0) / count) : 0
  const max = count ? Math.max(...records.map((r) => r.score)) : 0
  const min = count ? Math.min(...records.map((r) => r.score)) : 0
  const passCount = records.filter((r) => r.percent >= 80).length

  const questionStats = questions.map((q) => {
    const answered = records.map((r) => r.answers.find((a) => a.id === q.id)).filter(Boolean)
    const correctCount = answered.filter((a) => a!.correct).length
    return {
      id: q.id,
      stem: q.stem,
      rate: answered.length ? Math.round((correctCount / answered.length) * 100) : 0,
    }
  })

  // 分组统计：组数根据实际填写的组号动态生成
  const groupMap = new Map<string, ResultRecord[]>()
  for (const r of records) {
    const key = r.group !== undefined && r.group !== null ? `第 ${r.group} 组` : '未分组'
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(r)
  }
  const groupStats = Array.from(groupMap.entries())
    .map(([group, rs]) => ({
      group,
      submitted: rs.length,
      above80: rs.filter((r) => r.percent > 80).length,
    }))
    .sort((a, b) => {
      const na = parseInt(a.group.replace(/\D/g, ''), 10)
      const nb = parseInt(b.group.replace(/\D/g, ''), 10)
      if (isNaN(na)) return 1
      if (isNaN(nb)) return -1
      return na - nb
    })

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-end justify-between mt-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">成绩实时看板</h1>
            <p className="text-sm text-muted-foreground">《你肯定你有战略吗？》课前测试 · 手动刷新</p>
          </div>
          <div className="text-right space-y-1">
            <Button onClick={load} disabled={refreshing} size="sm">
              {refreshing ? '刷新中…' : '刷新'}
            </Button>
            <p className="text-sm text-muted-foreground">上次刷新 {lastRefresh}</p>
            {status && <p className="text-sm text-amber-600">{status}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">已提交</p></CardHeader>
            <CardContent><p className="text-3xl font-bold">{count} 人</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">平均正确率</p></CardHeader>
            <CardContent><p className="text-3xl font-bold">{avg}%</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">最高 / 最低</p></CardHeader>
            <CardContent><p className="text-3xl font-bold">{max} / {min}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">正确率≥80%占比</p></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{count ? Math.round((passCount / count) * 100) : 0}%</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">分组统计</CardTitle></CardHeader>
          <CardContent>
            {groupStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">小组</th>
                      <th className="py-2 pr-4">已提交人数</th>
                      <th className="py-2 pr-4">正确率高于 80% 人数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.map((g) => (
                      <tr key={g.group} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{g.group}</td>
                        <td className="py-2 pr-4">{g.submitted}</td>
                        <td className="py-2 pr-4">
                          <span className={g.above80 > 0 ? 'text-green-600 font-medium' : ''}>{g.above80}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">学员成绩（按提交时间倒序）</CardTitle></CardHeader>
          <CardContent>
            {count === 0 ? (
              <p className="text-sm text-muted-foreground">暂无数据</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">小组</th>
                      <th className="py-2 pr-4">姓名</th>
                      <th className="py-2 pr-4">得分</th>
                      <th className="py-2 pr-4">正确率</th>
                      <th className="py-2 pr-4">提交时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">
                          {r.group !== undefined && r.group !== null ? `第 ${r.group} 组` : '—'}
                        </td>
                        <td className="py-2 pr-4 font-medium">{r.name}</td>
                        <td className="py-2 pr-4">{r.score} / {r.total}</td>
                        <td className={`py-2 pr-4 ${r.percent >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                          {r.percent}%
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {new Date(r.submittedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">每题正确率（找出薄弱题目）</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {questionStats.map((s) => (
              <div key={s.id} className="space-y-1">
                <div className="flex justify-between text-sm gap-4">
                  <span className="truncate">
                    {s.id}． {s.stem}
                  </span>
                  <span className={`whitespace-nowrap font-medium ${s.rate >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.rate}%
                  </span>
                </div>
                <Progress value={s.rate} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
