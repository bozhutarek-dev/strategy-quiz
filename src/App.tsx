import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { questions, QUIZ_TITLE, QUIZ_SUBTITLE } from '@/data/questions'

type Stage = 'start' | 'quiz' | 'result'

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function App() {
  const [stage, setStage] = useState<Stage>('start')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [error, setError] = useState('')

  const answeredCount = Object.keys(answers).length
  const total = questions.length

  const score = useMemo(
    () => questions.reduce((s, q) => s + (answers[q.id] === q.correctIndex ? 1 : 0), 0),
    [answers],
  )

  const startQuiz = () => {
    setStage('quiz')
    window.scrollTo(0, 0)
  }

  const submit = () => {
    if (answeredCount < total) {
      const firstUnanswered = questions.find((q) => answers[q.id] === undefined)
      setError(`还有 ${total - answeredCount} 题未作答，请完成后再提交`)
      if (firstUnanswered) {
        document.getElementById(`q-${firstUnanswered.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setError('')
    setStage('result')
    window.scrollTo(0, 0)
  }

  const restart = () => {
    setAnswers({})
    setStage('start')
    window.scrollTo(0, 0)
  }

  if (stage === 'start') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl leading-relaxed">{QUIZ_TITLE}</CardTitle>
            <p className="text-sm text-muted-foreground">{QUIZ_SUBTITLE}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" onClick={startQuiz}>
              开始作答
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              请认真阅读题目，独立完成填写
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (stage === 'result') {
    const percent = Math.round((score / total) * 100)
    return (
      <div className="min-h-screen bg-slate-50 pb-16">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          <Card className="shadow-lg mt-4">
            <CardHeader className="text-center">
              <p className="text-sm text-muted-foreground">您的测试成绩</p>
              <CardTitle className="text-5xl font-bold my-2">
                {score}
                <span className="text-2xl text-muted-foreground"> / {total}</span>
              </CardTitle>
              <p className={`text-lg font-medium ${percent >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                正确率 {percent}%
              </p>
            </CardHeader>
          </Card>

          <h2 className="text-lg font-semibold">逐题解析</h2>

          {questions.map((q) => {
            const user = answers[q.id]
            const correct = user === q.correctIndex
            return (
              <Card key={q.id} id={`r-${q.id}`} className={correct ? 'border-green-200' : 'border-red-300'}>
                <CardHeader className="pb-2">
                  <p className={`text-sm font-medium ${correct ? 'text-green-700' : 'text-red-600'}`}>
                    {correct ? '✓ 回答正确' : '✗ 回答错误'}
                  </p>
                  <CardTitle className="text-base leading-relaxed font-medium">
                    {q.id}． {q.stem}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {q.options.map((opt, i) => {
                    const isCorrect = i === q.correctIndex
                    const isUser = i === user
                    return (
                      <div
                        key={i}
                        className={`rounded-md border p-3 text-sm leading-relaxed ${
                          isCorrect
                            ? 'border-green-500 bg-green-50'
                            : isUser
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-200'
                        }`}
                      >
                        <span className="font-medium mr-1">{OPTION_LETTERS[i]}.</span>
                        {opt}
                        {isCorrect && <span className="ml-2 text-green-700 font-medium">✓ 正确答案</span>}
                        {isUser && !isCorrect && <span className="ml-2 text-red-600 font-medium">✗ 您的选择</span>}
                      </div>
                    )
                  })}
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm leading-relaxed">
                    <span className="font-medium">解析（原文引用）：</span>
                    {q.explanation}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Button className="w-full" size="lg" variant="outline" onClick={restart}>
            重新作答
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-medium truncate">{QUIZ_TITLE}</h1>
            <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">
              {answeredCount} / {total}
            </span>
          </div>
          <Progress value={(answeredCount / total) * 100} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {questions.map((q) => (
          <Card key={q.id} id={`q-${q.id}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base leading-relaxed font-medium">
                {q.id}． {q.stem}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[q.id] !== undefined ? String(answers[q.id]) : ''}
                onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: Number(v) }))}
              >
                {q.options.map((opt, i) => (
                  <div key={i} className="flex items-start space-x-3 rounded-md border border-slate-200 p-3 mb-2 has-[[data-state=checked]]:border-slate-500 has-[[data-state=checked]]:bg-slate-100">
                    <RadioGroupItem value={String(i)} id={`q${q.id}-${i}`} className="mt-1" />
                    <Label htmlFor={`q${q.id}-${i}`} className="text-sm leading-relaxed font-normal cursor-pointer flex-1">
                      <span className="font-medium mr-1">{OPTION_LETTERS[i]}.</span>
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <Button className="w-full" size="lg" onClick={submit}>
          提交试卷（{answeredCount} / {total}）
        </Button>
      </div>
    </div>
  )
}
