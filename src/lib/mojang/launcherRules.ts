import type { MojangArgumentEntry, MojangLibrary, MojangRule } from "./mojang.js";

const FIXED_OS_NAME = "linux";
const FIXED_OS_ARCH = "x86_64";

export interface RuleContext {
  features: Record<string, boolean>;
}

function ruleMatches(rule: MojangRule, context: RuleContext): boolean {
  if (rule.os) {
    if (rule.os.name !== undefined && rule.os.name !== FIXED_OS_NAME) {
      return false;
    }
    if (rule.os.arch !== undefined && rule.os.arch !== FIXED_OS_ARCH) {
      return false;
    }
  }
  if (rule.features) {
    for (const [key, expected] of Object.entries(rule.features)) {
      if ((context.features[key] ?? false) !== expected) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Evaluates a Mojang launcher rule list against a fixed linux/x86_64 target and the
 * given feature flags. No rules means always allowed; otherwise the last matching
 * rule's action wins, matching vanilla launcher semantics.
 */
export function evaluateRules(rules: MojangRule[] | undefined, context: RuleContext): boolean {
  if (!rules || rules.length === 0) {
    return true;
  }
  let allowed = false;
  for (const rule of rules) {
    if (ruleMatches(rule, context)) {
      allowed = rule.action === "allow";
    }
  }
  return allowed;
}

export function substituteTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\$\{([^}]+)\}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(variables, token) ? variables[token] : match,
  );
}

/**
 * Filters a Mojang arguments.jvm/arguments.game array by rules, expands string|string[]
 * values, and substitutes ${placeholder} tokens, flattening to argv-ready strings.
 */
export function resolveArguments(
  entries: MojangArgumentEntry[],
  variables: Record<string, string>,
  context: RuleContext,
): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    if (typeof entry === "string") {
      result.push(substituteTemplate(entry, variables));
      continue;
    }
    if (!evaluateRules(entry.rules, context)) {
      continue;
    }
    const values = Array.isArray(entry.value) ? entry.value : [entry.value];
    for (const value of values) {
      result.push(substituteTemplate(value, variables));
    }
  }
  return result;
}

export function filterLibrariesForLinux(libraries: MojangLibrary[]): MojangLibrary[] {
  return libraries.filter((lib) => lib.downloads.artifact !== undefined && evaluateRules(lib.rules, { features: {} }));
}
