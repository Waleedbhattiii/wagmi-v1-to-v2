import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 02: Rename WagmiConfig → WagmiProvider in imports and JSX.
 */

export function getSelector() {
  return { rule: { pattern: "WagmiConfig" } };
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();

  // Confirm WagmiConfig is imported from wagmi
  const hasImport = rootNode.find({
    rule: {
      any: [
        { pattern: `import { $$$A, WagmiConfig, $$$B } from 'wagmi'` },
        { pattern: `import { $$$A, WagmiConfig, $$$B } from "wagmi"` },
        { pattern: `import { WagmiConfig } from 'wagmi'` },
        { pattern: `import { WagmiConfig } from "wagmi"` },
      ],
    },
  });

  if (!hasImport) return null;

  // Find every occurrence of "WagmiConfig" as a standalone identifier/JSX tag
  const nodes = rootNode.findAll({ rule: { pattern: "WagmiConfig" } });

  if (nodes.length === 0) return null;

  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  const seen = new Set<number>();

  for (const node of nodes) {
    const id = node.id();
    if (seen.has(id)) continue;
    seen.add(id);

    if (node.text() !== "WagmiConfig") continue;

    const range = node.range();
    edits.push({
      startPos: range.start.index,
      endPos: range.end.index,
      insertedText: "WagmiProvider",
    });
  }

  if (edits.length === 0) return null;
  return rootNode.commitEdits(edits);
};

export default transform;
