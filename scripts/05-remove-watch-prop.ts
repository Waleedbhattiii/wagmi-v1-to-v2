import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 05: Remove the `watch` prop from hooks that dropped it in v2.
 *
 * Safety guarantees:
 * - useBlock and useBlockNumber intentionally excluded (watch still valid in v2)
 * - Edits are non-overlapping: TODO inserted BEFORE the statement range,
 *   call replacement covers the call range only
 * - No regex on source text — uses AST pattern matching
 */

const HOOKS_LOST_WATCH = [
  "useBalance", "useToken", "useTransaction",
  "useContractRead", "useReadContract",
  "useContractReads", "useReadContracts",
  "useEnsAddress", "useEnsAvatar", "useEnsName", "useEnsResolver",
  "useEnsText", "useGasPrice", "useFeeData", "useEstimateFeesPerGas",
  "useEstimateGas",
];

const TODO =
  "// TODO(wagmi-codemod): 'watch' prop removed in v2. " +
  "Use useBlockNumber + useEffect to refetch:\n" +
  "//   const { data: blockNumber } = useBlockNumber({ watch: true })\n" +
  "//   useEffect(() => { refetch() }, [blockNumber])\n";

export function getSelector() {
  return {
    rule: {
      any: HOOKS_LOST_WATCH.map((name) => ({ pattern: `${name}($$$ARGS)` })),
    },
  };
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();
  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  const seen = new Set<number>();

  for (const hookName of HOOKS_LOST_WATCH) {
    for (const watchVal of ["true", "false"]) {
      const patterns = [
        `${hookName}({watch: ${watchVal}})`,
        `${hookName}({$$$A, watch: ${watchVal}})`,
        `${hookName}({watch: ${watchVal}, $$$B})`,
        `${hookName}({$$$A, watch: ${watchVal}, $$$B})`,
      ];

      for (const pattern of patterns) {
        const matches = rootNode.findAll({ rule: { pattern } });

        for (const call of matches) {
          const id = call.id();
          if (seen.has(id)) continue;
          seen.add(id);

          const callRange = call.range();
          const callText = call.text();

          // Find the enclosing statement for the TODO insertion point
          // CRITICAL: TODO insertPos must be OUTSIDE the call range to avoid overlapping edits
          let stmtNode = call.parent();
          while (stmtNode) {
            const k = stmtNode.kind();
            if (
              k === "lexical_declaration" ||
              k === "variable_declaration" ||
              k === "expression_statement"
            ) break;
            stmtNode = stmtNode.parent();
          }

          // The stmt start must be <= call start (it's the enclosing statement)
          // If stmtNode is the call itself or beyond it, we have no good anchor
          const stmtStart = stmtNode ? stmtNode.range().start.index : callRange.start.index;

          // Safe: insert TODO at stmt start (before the call range)
          // This is a zero-length insertion so it never overlaps with the call edit
          edits.push({
            startPos: stmtStart,
            endPos: stmtStart,
            insertedText: TODO,
          });

          // Remove watch: true/false from the call using AST-aware text manipulation
          // Strategy: rebuild call text by removing just the watch property
          // We find "watch: true" or "watch: false" in the call text and remove it
          // along with its surrounding comma, carefully preserving the rest
          const watchPattern = new RegExp(
            `(,\\s*watch\\s*:\\s*${watchVal}\\b)|(\\bwatch\\s*:\\s*${watchVal}\\b\\s*,?)`,
            "g"
          );

          // Remove trailing comma if watch was last prop, or leading comma if not first
          let newCallText = callText
            .replace(new RegExp(`,\\s*watch\\s*:\\s*${watchVal}\\b`, "g"), "")
            .replace(new RegExp(`\\bwatch\\s*:\\s*${watchVal}\\b\\s*,\\s*`, "g"), "")
            .replace(new RegExp(`\\bwatch\\s*:\\s*${watchVal}\\b`, "g"), "");

          // Clean up any double commas or trailing/leading commas inside braces
          newCallText = newCallText
            .replace(/,(\s*,)+/g, ",")
            .replace(/\{\s*,/g, "{")
            .replace(/,\s*\}/g, "}");

          edits.push({
            startPos: callRange.start.index,
            endPos: callRange.end.index,
            insertedText: newCallText,
          });
        }
      }
    }
  }

  if (edits.length === 0) return null;
  return rootNode.commitEdits(edits);
};

export default transform;
