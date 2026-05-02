import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 01: Rename deprecated wagmi v1 hooks to v2 equivalents.
 *
 * Import detection uses text-based check (importText.includes) rather than
 * pattern matching — this correctly handles all positions (first, middle, last)
 * and avoids $$$A/$$$B matching failures when hook is first or last specifier.
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

const RETURN_SHAPE_TODOS: Record<string, string> = {
  useSwitchNetwork:
    "// TODO(wagmi-codemod): useSwitchChain return shape changed.\n" +
    "// Rename destructured result: switchNetwork → switchChain, switchNetworkAsync → switchChainAsync\n",
  useSigner:
    "// TODO(wagmi-codemod): useWalletClient returns a Viem WalletClient, not an ethers Signer.\n" +
    "// Update all code that uses the result as an ethers Signer.\n",
  useContractWrite:
    "// TODO(wagmi-codemod): useWriteContract API changed significantly.\n" +
    "// 1. Rename: write → writeContract, writeAsync → writeContractAsync\n" +
    "// 2. Contract config (address, abi, functionName, args) moves from hook args to writeContract() call site.\n" +
    "//    Before: const { write } = useContractWrite({ address, abi, functionName }); write()\n" +
    "//    After:  const { writeContract } = useWriteContract(); writeContract({ address, abi, functionName, args })\n",
  useWaitForTransaction:
    "// TODO(wagmi-codemod): useWaitForTransactionReceipt: hash type changed from string to 0x${string}.\n" +
    "// Ensure hash is typed as `0x\${string} | undefined` not `string | undefined`.\n",
};

export function getSelector() {
  return {
    rule: {
      any: Object.keys(HOOK_RENAMES).map((name) => ({ pattern: name })),
    },
  };
}

/**
 * Check if a hook name is imported from wagmi using text-based detection.
 * This avoids $$$A/$$$B pattern failures when the hook is the first or last specifier.
 * Uses word boundary check to avoid false positives (e.g. useContractRead vs useContractReads).
 */
function isImportedFromWagmi(source: string, hookName: string): boolean {
  // Find all wagmi import statements
  const wagmiImportRegex = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]wagmi['"]/g;
  let match;
  while ((match = wagmiImportRegex.exec(source)) !== null) {
    const specifiers = match[1];
    // Word boundary check: hookName must appear as a complete identifier
    // Handles: "useSwitchNetwork", "useNetwork, useSwitchNetwork", "useSwitchNetwork,"
    const specifierRegex = new RegExp(`(?:^|[,\\s])(?:type\\s+)?${hookName}(?:[,\\s]|$)`);
    if (specifierRegex.test(specifiers)) {
      return true;
    }
  }
  return false;
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();
  const source = root.source();

  // Determine which hooks are imported from wagmi using reliable text-based check
  const importedFromWagmi = new Set<string>();
  for (const oldName of Object.keys(HOOK_RENAMES)) {
    if (isImportedFromWagmi(source, oldName)) {
      importedFromWagmi.add(oldName);
    }
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

      // Exact match — prevents useContractRead matching useContractReads
      if (node.text() !== oldName) continue;

      // Add call-site TODO once per hook per file
      if (RETURN_SHAPE_TODOS[oldName] && !todosAdded.has(oldName)) {
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
            edits.push({
              startPos: stmtNode.range().start.index,
              endPos: stmtNode.range().start.index,
              insertedText: RETURN_SHAPE_TODOS[oldName],
            });
            todosAdded.add(oldName);
          }
        }
      }

      // Rename the identifier everywhere (import specifier + call sites + type refs)
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
