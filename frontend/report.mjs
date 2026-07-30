#!/usr/bin/env node
// Turns a Vitest JSON-reporter file into a Markdown run report, mirroring the
// format and conventions of testing/backend/report.py so both suites read
// the same way. Usage: node report.mjs <path-to-vitest-json-output>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPORTS_DIR = join(HERE, 'reports')
const STATUS_ICON = { passed: '✅', failed: '❌', pending: '⏭️', skipped: '⏭️', todo: '⏭️' }

function escapePipes(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function main() {
  const rawPath = process.argv[2]
  if (!rawPath) {
    console.error('Usage: node report.mjs <path-to-vitest-json-output>')
    return 1
  }
  const raw = JSON.parse(readFileSync(rawPath, 'utf-8'))
  mkdirSync(REPORTS_DIR, { recursive: true })

  const now = new Date()
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15)
  const outPath = join(REPORTS_DIR, `frontend_test.${stamp}.md`)

  const files = raw.testResults ?? []
  const perFile = files.map((f) => {
    const assertions = f.assertionResults ?? []
    const passed = assertions.filter((a) => a.status === 'passed').length
    const failed = assertions.filter((a) => a.status === 'failed').length
    const skipped = assertions.length - passed - failed
    return { name: relative(HERE, f.name).replace(/\\/g, '/'), passed, failed, skipped, assertions }
  })

  const overallPassed = raw.numPassedTests ?? 0
  const overallFailed = raw.numFailedTests ?? 0
  const overallSkipped = (raw.numPendingTests ?? 0) + (raw.numTodoTests ?? 0)
  const latestEnd = files.reduce((max, f) => Math.max(max, f.endTime ?? 0), raw.startTime ?? 0)
  const durationSec = ((latestEnd - (raw.startTime ?? latestEnd)) / 1000).toFixed(1)
  const overallIcon = overallFailed === 0 ? '✅' : '❌'
  const overallVerdict = overallFailed === 0 ? 'ALL PASSED' : `${overallFailed} FAILURE(S)`

  const lines = []
  lines.push('# Frontend Test Suite — Run Report')
  lines.push('')
  lines.push('| | |')
  lines.push('|---|---|')
  lines.push(`| **Generated** | ${now.toISOString().replace('T', ' ').slice(0, 19)} UTC |`)
  lines.push('| **Suite** | Vitest unit/component tests (jsdom, mocked HTTP — no live backend, no test data written anywhere) |')
  lines.push(`| **Files run** | ${files.length} |`)
  lines.push(`| **Duration** | ${durationSec}s |`)
  lines.push(
    `| **Result** | ${overallIcon} ${overallVerdict} (pass=${overallPassed}, fail=${overallFailed}, skip=${overallSkipped}) |`
  )
  lines.push('')

  lines.push('## Summary')
  lines.push('')
  lines.push('| File | Pass | Fail | Skip | Status |')
  lines.push('|---|---:|---:|---:|:---:|')
  for (const f of perFile) {
    const icon = f.failed === 0 ? '✅' : '❌'
    lines.push(`| ${f.name} | ${f.passed} | ${f.failed} | ${f.skipped} | ${icon} |`)
  }
  lines.push(`| **TOTAL** | **${overallPassed}** | **${overallFailed}** | **${overallSkipped}** | ${overallIcon} |`)
  lines.push('')

  const failures = perFile.flatMap((f) =>
    f.assertions
      .filter((a) => a.status === 'failed')
      .map((a) => ({
        label: `${f.name} — ${a.fullName || a.title}`,
        message: (a.failureMessages || []).join('\n\n') || 'Failed',
      }))
  )
  if (failures.length) {
    lines.push('## Failures')
    lines.push('')
    for (const { label, message } of failures) {
      lines.push(`### ${escapePipes(label)}`)
      lines.push('')
      lines.push('```')
      lines.push(message)
      lines.push('```')
      lines.push('')
    }
  }

  lines.push('## Full results')
  lines.push('')
  for (const f of perFile) {
    lines.push(`### ${f.name}`)
    lines.push('')
    lines.push('| Case | Status | Time (ms) | Notes |')
    lines.push('|---|:---:|---:|---|')
    for (const a of f.assertions) {
      const icon = STATUS_ICON[a.status] || a.status
      const note = a.status === 'failed' ? escapePipes((a.failureMessages || [])[0] || '') : ''
      lines.push(`| ${escapePipes(a.fullName || a.title)} | ${icon} | ${(a.duration ?? 0).toFixed(0)} | ${note} |`)
    }
    lines.push('')
  }

  writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8')
  console.log(`\nReport written to ${outPath}`)
  return overallFailed === 0 ? 0 : 1
}

process.exit(main())
