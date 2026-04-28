import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 01: Rename deprecated wagmi v1 hooks to v2 equivalents.
 *
 * Safety guarantees:
 * - Only renames identifiers confirmed imported from 'wagmi'
 * - Exact text match (node.text() === oldName) prevents substring collisions
 * - Return-shape TODOs added once per hook per file, only at call sites
 * - useContractWrite gets a TODO flagging write → writeContract rename
 */

const HOOK_RENAMES: Record<string, string> = {
  useContractRead: "useReadContract",
  useContractWrite: "useWriteContract",
  useContractEvent: "useWatchContractEvent",
  useContractInfiniteReads: "useInfiniteReadContracts",
  useContractReads: "useReadContracts",
  useWaitForTransaction: "useWaitForTransactionReceipt",
  useSwitchNetwork: "useSwitchChain",
  useSigner: "useWalletClient",
  useProvider: "usePublicClient",
  useWebSocketProvider: "usePublicClient",
  useFeeData: "useEstimateFeesPerGas",
};

// Hooks where the returned object shape changed — need a TODO at the call site
const RETURN_SHAPE_TODOS: Record<string, string> = {
  useSwitchNetwork:
    "// TODO(wagmi-codemod): useSwitchChain return shape changed.\n" +
    "// Rename destructured result: switchNetwork → switchChain, switchNetworkAsync → switchChainAsync\n",
  useSigner:
    "// TODO(wagmi-codemod): useWalletClient returns a Viem WalletClient, not an ethers Signer.\n" +
    "// Update all code that uses the result as an ethers Signer.\n",
  useContractWrite:
    "// TODO(wagmi-codemod): useWriteContract return shape changed.\n" +
    "// Rename: write → writeContract, writeAsync → writeContractAsync\n",
};

export function getSelector() {
  return {
    rule: {
      // Use exact patterns to avoid substring collisions (e.g. useContractRead vs useContractReads)
      any: Object.keys(HOOK_RENAMES).map((name) => ({
        pattern: `${name}`,
      })),
    },
  };
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();

  // Step 1: determine which hooks are actually imported from 'wagmi'
  const importedFromWagmi = new Set<string>();
  for (const oldName of Object.keys(HOOK_RENAMES)) {
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
  const todosAdded = new Set<string>();

  for (const [oldName, newName] of Object.entries(HOOK_RENAMES)) {
    if (!importedFromWagmi.has(oldName)) continue;

    const nodes = rootNode.findAll({ rule: { pattern: oldName } });

    for (const node of nodes) {
      const id = node.id();
      if (seen.has(id)) continue;
      seen.add(id);

      // Exact match only — prevents useContractRead matching useContractReads
      if (node.text() !== oldName) continue;

      // Add return-shape TODO once per hook per file, only at call sites
      if (RETURN_SHAPE_TODOS[oldName] && !todosAdded.has(oldName)) {
        const parent = node.parent();
        if (parent && parent.kind() === "call_expression") {
          // Walk up to the enclosing statement
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
            edits.push({
              startPos: stmtNode.range().start.index,
              endPos: stmtNode.range().start.index,
              insertedText: RETURN_SHAPE_TODOS[oldName],
            });
            todosAdded.add(oldName);
          }
        }
      }

      // Rename the identifier
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
