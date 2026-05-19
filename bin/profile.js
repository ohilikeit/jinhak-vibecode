'use strict';

// jinhak-harness — 프로필 분기 (ADR-001)
// CLI --profile=X > env HARNESS_PROFILE > default 'eco'

const VALID = ['eco', 'standard', 'power'];

function parseProfileArg(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--profile' || a === '-p') {
      return args[i + 1];
    }
    const m = a.match(/^--profile=(.+)$/);
    if (m) return m[1];
  }
  return null;
}

function resolveProfile(args = process.argv.slice(2)) {
  const fromArg = parseProfileArg(args);
  const fromEnv = process.env.HARNESS_PROFILE;
  const raw = (fromArg || fromEnv || 'eco').trim().toLowerCase();
  if (!VALID.includes(raw)) {
    throw new Error(
      `unknown profile "${raw}". Use one of: ${VALID.join(', ')}`,
    );
  }
  return raw;
}

const BUDGETS = {
  eco: {
    frontmatter_at_boot: true,
    body_at_boot: false,
    body_eligible_at_boot: false,
    description_tuner: 'off',
    benchmark: 'off',
    stress_test: 'off',
    dry_run_enforced: true,
    failure_report: 'template-substitution',
  },
  standard: {
    frontmatter_at_boot: true,
    body_at_boot: false,
    body_eligible_at_boot: false,
    description_tuner: 'on-skill-create',
    benchmark: 'off',
    stress_test: 'off',
    dry_run_enforced: true,
    failure_report: 'template-substitution',
  },
  power: {
    frontmatter_at_boot: true,
    body_at_boot: false,
    body_eligible_at_boot: true,
    description_tuner: 'on-skill-create',
    benchmark: 'on-explicit',
    stress_test: 'on-explicit',
    dry_run_enforced: true,
    failure_report: 'llm-allowed',
  },
};

function budgetFor(profile) {
  return BUDGETS[profile];
}

module.exports = { resolveProfile, budgetFor, VALID };
