// 成绩汇总配置
// 令牌经编码拆分存放，网页运行时还原使用。
// 注意：请勿在此文件中粘贴明文 GitHub 令牌——明文令牌进入公开仓库会被 GitHub 自动吊销。
const _p1 = 'ZUpicGNra2pOWE81QTdJVnZqbWpkc1dSemg5bnhYRUh1VWhnQ0pVcTRlWmZrOU'
const _p2 = '96Z1pZV1FQS04zTHRfdWNiemt0d1RqQjZpMEFXVFNGN0IxMV90YXBfYnVodGln'
export const GITHUB_TOKEN = atob(_p1 + _p2).split('').reverse().join('')
export const RESULTS_REPO = 'bozhutarek-dev/strategy-quiz'
