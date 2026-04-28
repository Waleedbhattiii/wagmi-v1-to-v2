import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 03: Replace prepare hooks with v2 equivalents.
 *
 * usePrepareContractWrite → useSimulateContract
 * usePrepareSendTransaction → useEstimateGas
 *
 * TODO added ONCE per unique call site (not per identifier occurrence).
 * Import specifier is also renamed.
 */

const PREPARE_RENAMES: Record<string, string> = {
  usePrepareContractWrite: "useSimulateContract",
  usePrepareSendTransaction: "useEstimateGas",
};

export function getSelector() {
  return {
    rule: {
      any: Object.keys(PREPARE_RENAMES).map((name) => ({ pattern: name })),
    },
  };
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();
  const importedFromWagmi = new Set<string>();

  for (const oldName of Object.keys(PREPARE_RENAMES)) {
    const found = rootNode.find({
      rule: {
        any: [
          { pattern: `import { $$$A, ${oldName}, $$$B } from 'wagmi'` },
          { pattern: `import { $$$A, ${oldName}, $$$B } from "wagmi"` },
          { pattern: `import { ${oldName} } from 'wagmi'` },
          { pattern: `import { ${oldName} } from "wagmi"` },
        ],
      },
    });
    if (found) importedFromWagmi.add(oldName);
  }

  if (importedFromWagmi.size === 0) return null;

  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  const seen = new Set<number>();
  // Track statement positions where TODOs have been added — avoid duplicates
  const todoPositions = new Set<number>();

  for (const [oldName, newName] of Object.entries(PREPARE_RENAMES)) {
    if (!importedFromWagmi.has(oldName)) continue;

    const nodes = rootNode.findAll({ rule: { pattern: oldName } });

    for (const node of nodes) {
      const id = node.id();
      if (seen.has(id)) continue;
      seen.add(id);

      if (node.text() !== oldName) continue;

      // Only add TODO at actual call sites (parent is call_expression)
      const parent = node.parent();
      if (parent && parent.kind() === "call_expression") {
        let stmtNode = parent.parent();
        while (stmtNode) {
          const k = stmtNode.kind();
          if (
            k === "lexical_declaration" ||
            k === "variable_declaration" ||
            k === "expression_statement"
          ) break;
          stmtNode = stmtNode.parent();
        }

        if (stmtNode) {
          const stmtStart = stmtNode.range().start.index;
          // Only add TODO once per statement position
          if (!todoPositions.has(stmtStart)) {
            todoPositions.add(stmtStart);
            edits.push({
              startPos: stmtStart,
              endPos: stmtStart,
              insertedText:
                `// TODO(wagmi-codemod): ${oldName} → ${newName}. ` +
                `Rename destructured 'config' → 'data'. ` +
                `Pass 'data.request' to writeContract().\n`,
            });
          }
        }
      }

      // Rename the identifier (import specifier + call sites + type refs)
      const range = node.range();
      edits.push({
        startPos: range.start.index,
        endPos: range.end.index,
        insertedText: newName,
      });
    }
  }

  if (edits.length === 0) return null;
  return rootNode.commitEdits(edits);
};

export default transform;
