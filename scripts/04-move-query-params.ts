import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 04: Move TanStack Query params into the `query` property.
 *
 * Fixes:
 * - splitTopLevelCommas now tracks string literals to avoid splitting
 *   on commas inside string values like functionName: 'transfer,all'
 * - Dynamic indentation detection matches the file's actual style
 */

const WAGMI_QUERY_HOOKS = [
  "useReadContract", "useReadContracts", "useBalance", "useBlockNumber",
  "useBlock", "useEnsAddress", "useEnsAvatar", "useEnsName", "useEnsResolver",
  "useTransaction", "useTransactionReceipt", "useWaitForTransactionReceipt",
  "useEstimateGas", "useSimulateContract", "useGasPrice", "useEstimateFeesPerGas",
  "useToken", "useContractRead", "useContractReads", "useWaitForTransaction",
];

const TANSTACK_PARAMS = new Set([
  "enabled", "staleTime", "cacheTime", "gcTime", "refetchInterval",
  "refetchIntervalInBackground", "refetchOnWindowFocus", "refetchOnMount",
  "refetchOnReconnect", "retry", "retryDelay", "onSuccess", "onError",
  "onSettled", "select", "keepPreviousData", "placeholderData",
  "notifyOnChangeProps", "structuralSharing", "suspense", "useErrorBoundary",
]);

export function getSelector() {
  return {
    rule: {
      any: WAGMI_QUERY_HOOKS.map((name) => ({ pattern: `${name}($$$ARGS)` })),
    },
  };
}

/**
 * Split text by top-level commas, correctly handling:
 * - Nested braces, brackets, parens
 * - String literals (single, double, template) — commas inside strings ignored
 * - TypeScript generics < > (tracked for depth)
 */
function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    // Handle string boundaries
    if (!inString && (ch === "'" || ch === '"' || ch === "`")) {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }
    if (inString) {
      current += ch;
      // Escape sequence — skip next char
      if (ch === "\\" && prev !== "\\") continue;
      if (ch === stringChar && prev !== "\\") {
        inString = false;
        stringChar = "";
      }
      continue;
    }

    // Track nesting depth (not inside strings)
    if (ch === "{" || ch === "(" || ch === "[" || ch === "<") depth++;
    else if (ch === "}" || ch === ")" || ch === "]" || ch === ">") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Detect indentation of a line at the given source position.
 */
function detectIndent(source: string, pos: number): string {
  let lineStart = pos;
  while (lineStart > 0 && source[lineStart - 1] !== "\n") lineStart--;
  let indent = "";
  for (let i = lineStart; i < source.length; i++) {
    if (source[i] === " " || source[i] === "\t") indent += source[i];
    else break;
  }
  return indent || "  ";
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();
  const source = root.source();
  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  const seen = new Set<number>();

  for (const hookName of WAGMI_QUERY_HOOKS) {
    const callSites = rootNode.findAll({
      rule: { pattern: `${hookName}($$$ARGS)` },
    });

    for (const call of callSites) {
      const id = call.id();
      if (seen.has(id)) continue;
      seen.add(id);

      const callText = call.text();

      // Skip if already has query: (avoid double-processing)
      // Use word boundary check to avoid matching "queryKey:" or similar
      if (/\bquery\s*:/.test(callText)) continue;

      const openBrace = callText.indexOf("{");
      const closeBrace = callText.lastIndexOf("}");
      if (openBrace === -1 || closeBrace === -1) continue;

      const innerText = callText.slice(openBrace + 1, closeBrace).trim();
      if (!innerText) continue;

      const props = splitTopLevelCommas(innerText);
      const wagmiProps: string[] = [];
      const queryProps: string[] = [];

      for (const prop of props) {
        const trimmed = prop.trim();
        if (!trimmed) continue;
        // Extract key: must be before first colon that is NOT inside a string
        // Simple approach: get text before first ':' that appears before any '{' or '('
        const colonIdx = trimmed.search(/\s*:/);
        const key = (colonIdx > -1 ? trimmed.slice(0, colonIdx) : trimmed).trim();
        // Strip any TypeScript type annotations from key (e.g. "key as Type")
        const cleanKey = key.split(" ")[0].trim();
        if (TANSTACK_PARAMS.has(cleanKey)) {
          queryProps.push(trimmed);
        } else {
          wagmiProps.push(trimmed);
        }
      }

      if (queryProps.length === 0) continue;

      const callRange = call.range();
      const baseIndent = detectIndent(source, callRange.start.index);
      const propIndent = baseIndent + "  ";
      const queryPropIndent = propIndent + "  ";

      const queryBlock =
        `query: {\n${queryPropIndent}${queryProps.join(`,\n${queryPropIndent}`)},\n${propIndent}}`;
      const allProps = [...wagmiProps, queryBlock];
      const prefix = callText.slice(0, openBrace + 1);
      const newCallText =
        `${prefix}\n${propIndent}${allProps.join(`,\n${propIndent}`)},\n${baseIndent}})`;

      edits.push({
        startPos: callRange.start.index,
        endPos: callRange.end.index,
        insertedText: newCallText,
      });
    }
  }

  if (edits.length === 0) return null;
  return rootNode.commitEdits(edits);
};

export default transform;
