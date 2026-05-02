import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 08: Remove stale wagmi v1 import specifiers.
 *
 * IMPORTANT: Only removes specifiers that have NO v2 equivalent rename.
 * Hooks that ARE renamed by transform 01 (like useSwitchNetwork → useSwitchChain)
 * must NOT be in this list — transform 01 already renamed them in the import.
 * Adding them here would remove the already-renamed v2 specifier.
 *
 * Only include hooks that are:
 * - Completely removed with no direct rename (configureChains, useNetwork)
 * - Already handled by another transform that also fixes the import
 *   (usePrepareContractWrite → renamed by 03, WagmiConfig → renamed by 02)
 */

const STALE = new Set([
  // Renamed by transform 02 (WagmiConfig → WagmiProvider in import too)
  "WagmiConfig",
  // Renamed by transform 03
  "usePrepareContractWrite",
  "usePrepareSendTransaction",
  // Removed by transform 07 (no rename, just deleted from import)
  "useNetwork",
  "configureChains",
  // createClient renamed to createConfig by transform 07 import rebuild
  "createClient",
  // NOTE: The following are intentionally NOT here because transform 01
  // renames them in-place in the import specifier:
  // useSwitchNetwork → useSwitchChain (handled by 01)
  // useContractRead → useReadContract (handled by 01)
  // useContractWrite → useWriteContract (handled by 01)
  // useContractEvent → useWatchContractEvent (handled by 01)
  // useContractReads → useReadContracts (handled by 01)
  // useContractInfiniteReads → useInfiniteReadContracts (handled by 01)
  // useWaitForTransaction → useWaitForTransactionReceipt (handled by 01)
  // useSigner → useWalletClient (handled by 01)
  // useProvider → usePublicClient (handled by 01)
  // useWebSocketProvider → usePublicClient (handled by 01)
  // useFeeData → useEstimateFeesPerGas (handled by 01)
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

function specifierName(spec: string): string {
  return spec
    .replace(/^type\s+/, "")
    .split(/\s+as\s+/)[0]
    .trim();
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();

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

  if (remaining.length === specifiers.length) return null;

  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  const range = wagmiImport.range();

  if (remaining.length === 0) {
    edits.push({
      startPos: range.start.index,
      endPos: range.end.index + 1,
      insertedText: "",
    });
  } else {
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
