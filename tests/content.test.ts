import { readdir, readFile, writeFile, mkdir, rmdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execa } from 'execa'
import { formatter as mdcFormatter } from '../src/formatter'

describe(`MDC Formatter`, async () => {
  beforeAll(async () => {
    await mkdir(join(__dirname, 'content/tmp'), { recursive: true })
  })

  afterAll(async () => {
    await rmdir(join(__dirname, 'content/tmp'), { recursive: true })
  })

  const inputs = await readdir(join(__dirname, 'content/input'))

  for (const input of inputs) {
    it(`formats ${input}`, async () => {
      const content = await readFile(join(__dirname, 'content/input', input), 'utf-8')
      const expected = await readFile(join(__dirname, 'content/output', input), 'utf-8')

      const formatted = mdcFormatter(content, { tabSize: 2 })

      await writeFile(join(__dirname, 'content/tmp', input), formatted)
      const error = await execa('npx', ['mdclint', join(__dirname, 'content/tmp', input)]).then(result => result.stdout).catch(error => error)
      const realError = String(error).split('\n')
        .filter(line => line.trim().length > 0 && !line.includes('failed with exit code 1'))
        .filter(line => !line.includes('tests/content/tmp/') && !line.includes(' problems'))

        // TODO: fix on mdclint
        .filter(line => !line.includes('Code block style'))
        .filter(line => !line.includes('Lists should be surrounded by blank lines'))

        .join('\n')

      expect(realError).toBe('')

      expect(formatted).toBe(expected)
    })
  }
})
