#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const usage = `
Usage:
  npm run release -- <version|tag> [--include-worktree] [--no-push] [--dry-run]

Examples:
  npm run release -- 0.2.0
  npm run release -- v0.2.0
  npm run release -- 0.2.0 -- --include-worktree

Options:
  --include-worktree  Commit all current worktree changes together with the version bump.
  --no-push           Create the commit and tag locally, but do not push.
  --dry-run           Validate inputs and print the planned commands without changing files.
`

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const flags = new Set(args.filter((arg) => arg.startsWith('--')))
const versionInput = args.find((arg) => !arg.startsWith('--'))

if (!versionInput || flags.has('--help') || flags.has('-h')) {
  console.log(usage.trim())
  process.exit(versionInput ? 0 : 1)
}

const allowedFlags = new Set(['--include-worktree', '--no-push', '--dry-run'])
for (const flag of flags) {
  if (!allowedFlags.has(flag)) {
    fail(`Unknown option: ${flag}`)
  }
}

const includeWorktree = flags.has('--include-worktree') || envFlag('npm_config_include_worktree')
const noPush =
  flags.has('--no-push') || envFlag('npm_config_no_push') || process.env.npm_config_push === 'false'
const dryRun = flags.has('--dry-run') || envFlag('npm_config_dry_run')

const version = versionInput.replace(/^v/i, '')
const tag = `v${version}`
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

if (!semverPattern.test(version)) {
  fail(`Expected a semver version like 1.2.3 or v1.2.3, got "${versionInput}".`)
}

const plan = []

run('git', ['rev-parse', '--is-inside-work-tree'], { quiet: true })

const branch = run('git', ['branch', '--show-current'], { quiet: true }).stdout.trim()
if (!branch) {
  fail('Release tagging requires a branch. You appear to be in detached HEAD state.')
}

const localTag = run('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], {
  allowFailure: true,
  quiet: true
})
if (localTag.status === 0) {
  fail(`Tag ${tag} already exists locally.`)
}

const remoteTag = run('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`], {
  allowFailure: true,
  quiet: true
})
if (remoteTag.status === 0) {
  fail(`Tag ${tag} already exists on origin.`)
}

const initialStatus = getStatus()
if (initialStatus && !includeWorktree) {
  fail(
    [
      'Working tree has uncommitted changes.',
      'Commit or stash them first, or rerun with --include-worktree to include them in the release commit.',
      '',
      initialStatus
    ].join('\n')
  )
}

const npmVersionArgs = ['version', version, '--no-git-tag-version']
if (includeWorktree) {
  npmVersionArgs.push('--force')
}
step('npm', npmVersionArgs)

if (includeWorktree) {
  step('git', ['add', '-A'])
} else {
  step('git', ['add', 'package.json', 'package-lock.json'])
}

step('git', ['commit', '-m', `chore: release ${tag}`])
step('git', ['tag', '-a', tag, '-m', `Release ${tag}`])

if (!noPush) {
  const upstream = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
    allowFailure: true,
    quiet: true
  })

  if (upstream.status === 0) {
    step('git', ['push'])
  } else {
    step('git', ['push', '-u', 'origin', 'HEAD'])
  }

  step('git', ['push', 'origin', tag])
}

if (dryRun) {
  console.log(`Dry run for ${tag} on branch ${branch}:`)
  for (const { command, args } of plan) {
    console.log(`  ${formatCommand(command, args)}`)
  }
  process.exit(0)
}

console.log(`Releasing ${tag} from ${branch}...`)
for (const { command, args } of plan) {
  run(command, args)
}
console.log(`Release ${tag} is ready${noPush ? ' locally' : ' and pushed'}.`)

function getStatus() {
  return run('git', ['status', '--porcelain'], { quiet: true }).stdout.trim()
}

function step(command, args) {
  plan.push({ command, args })
}

function run(command, args, options = {}) {
  const result = spawnSync(resolveCommand(command), args, {
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
    shell: false
  })

  if (result.error) {
    fail(result.error.message)
  }

  if (!options.allowFailure && result.status !== 0) {
    const details = options.quiet ? result.stderr || result.stdout : ''
    fail(details.trim() || `${formatCommand(command, args)} failed with exit code ${result.status}.`)
  }

  return result
}

function resolveCommand(command) {
  if (process.platform === 'win32' && command === 'npm') {
    return 'npm.cmd'
  }

  return command
}

function formatCommand(command, args) {
  return [command, ...args.map(quoteArg)].join(' ')
}

function quoteArg(arg) {
  return /\s/.test(arg) ? JSON.stringify(arg) : arg
}

function envFlag(name) {
  return process.env[name] === 'true'
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
