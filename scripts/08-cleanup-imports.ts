import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 08: Remove stale wagmi v1 import specifiers.
 *
 * Fixes:
 * - Uses lastIndexOf("}") for multiline import parsing (not regex /\{([^}]+)\}/)
 * - Handles `type` imports: `type WagmiConfig` and `import type { WagmiConfig }`
 * - specifierName() helper strips type keyword and aliases before checking STALE
 */

const STALE = new Set([
  "WagmiConfig",
  "useContractRead",
  "useContractWrite",
  "useContractEvent",
  "useContractInfiniteReads",
  "useContractReads",
  "useWaitForTransaction",
  "useSwitchNetwork",
  "useSigner",
  "useProvider",
  "useWebSocketProvider",
  "useFeeData",
  "usePrepareContractWrite",
  "usePrepareSendTransaction",
  "useNetwork",
  "createClient",
  "configureChains",
]);

export function getSelector() {
  return {
    rule: {
      any: Array.from(STALE).map((name) => ({
        any: [
          { pattern: `import { $$$A, ${name}, $$$B } from 'wagmi'` },
          { pattern: `import { ${name} } from 'wagmi'` },
          { pattern: `import { $$$A, ${name}, $$$B } from "wagmi"` },
          { pattern: `import { ${name} } from "wagmi"` },
        ],
      })),
    },
  };
}

/**
 * Parse import specifiers correctly from import text.
 * Uses lastIndexOf to handle multiline imports.
 */
function parseSpecifiers(importText: string): string[] {
  const start = importText.indexOf("{");
  const end = importText.lastIndexOf("}");
  if (start === -1 || end === -1) return [];
  return importText
    .slice(start + 1, end)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract the bare identifier name from a specifier.
 * Handles: "useAccount", "type useAccount", "useAccount as ua", "type useAccount as ua"
 */
function specifierName(spec: string): string {
  return spec
    .replace(/^type\s+/, "")
    .split(/\s+as\s+/)[0]
    .trim();
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();

  // Handle both regular and type-only imports
  const wagmiImport = rootNode.find({
    rule: {
      any: [
        { pattern: `import { $$$SPECS } from 'wagmi'` },
        { pattern: `import { $$$SPECS } from "wagmi"` },
        { pattern: `import type { $$$SPECS } from 'wagmi'` },
        { pattern: `import type { $$$SPECS } from "wagmi"` },
      ],
    },
  });

  if (!wagmiImport) return null;

  const importText = wagmiImport.text();
  const specifiers = parseSpecifiers(importText);

  const remaining = specifiers.filter((s) => !STALE.has(specifierName(s)));

  // Nothing to remove
  if (remaining.length === specifiers.length) return null;

  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  const range = wagmiImport.range();

  if (remaining.length === 0) {
    // Remove the entire import statement (including trailing newline)
    edits.push({
      startPos: range.start.index,
      endPos: range.end.index + 1,
      insertedText: "",
    });
  } else {
    // Rebuild import with only non-stale specifiers
    const isTypeImport = importText.trimStart().startsWith("import type");
    const typeKeyword = isTypeImport ? "type " : "";
    const quote = importText.includes(`'wagmi'`) ? "'" : '"';
    const newImport = `import ${typeKeyword}{ ${remaining.join(", ")} } from ${quote}wagmi${quote}`;
    edits.push({
      startPos: range.start.index,
      endPos: range.end.index,
      insertedText: newImport,
    });
  }

  return rootNode.commitEdits(edits);
};

export default transform;
