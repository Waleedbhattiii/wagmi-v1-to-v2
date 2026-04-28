import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 07: Rename config API and handle useNetwork removal.
 *
 * Fixes:
 * - parseImportSpecifiers uses lastIndexOf("}") — handles multiline imports
 * - createClient check uses specifier parsing not string.includes()
 * - Aliased destructuring handled: { chain: currentChain } = useNetwork()
 * - Fallback TODO for unrecognized useNetwork patterns
 */

export function getSelector() {
  return {
    rule: {
      any: [
        { pattern: "createClient" },
        { pattern: "configureChains" },
        { pattern: "useNetwork" },
      ],
    },
  };
}

/**
 * Parse import specifiers from an import statement text.
 * Uses lastIndexOf to correctly handle multiline imports and type annotations.
 */
function parseImportSpecifiers(importText: string): string[] {
  const start = importText.indexOf("{");
  const end = importText.lastIndexOf("}");
  if (start === -1 || end === -1) return [];
  const inner = importText.slice(start + 1, end);
  return inner
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

/**
 * Extract the bare name from a specifier, handling:
 * - "useAccount" → "useAccount"
 * - "type useAccount" → "useAccount"
 * - "useAccount as ua" → "useAccount"
 * - "type useAccount as ua" → "useAccount"
 */
function specifierName(spec: string): string {
  return spec
    .replace(/^type\s+/, "")
    .split(/\s+as\s+/)[0]
    .split(/[\s:]/)[0]
    .trim();
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();
  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  const seen = new Set<number>();

  // ── 1. Find wagmi import ─────────────────────────────────────────────────
  const wagmiImport = rootNode.find({
    rule: {
      any: [
        { pattern: `import { $$$SPECS } from 'wagmi'` },
        { pattern: `import { $$$SPECS } from "wagmi"` },
      ],
    },
  });

  if (!wagmiImport) return null;

  const importText = wagmiImport.text();
  const specifiers = parseImportSpecifiers(importText);
  const specifierNames = specifiers.map(specifierName);

  const hasCreateClient = specifierNames.includes("createClient");
  const hasConfigureChains = specifierNames.includes("configureChains");
  const hasUseNetwork = specifierNames.includes("useNetwork");

  if (!hasCreateClient && !hasConfigureChains && !hasUseNetwork) return null;

  // ── 2. createClient → createConfig in code ───────────────────────────────
  if (hasCreateClient) {
    const nodes = rootNode.findAll({ rule: { pattern: "createClient" } });
    for (const node of nodes) {
      const id = node.id();
      if (seen.has(id)) continue;
      seen.add(id);
      if (node.text() !== "createClient") continue;
      // Skip the import statement itself — handled by import rebuild below
      const nodeStart = node.range().start.index;
      const impStart = wagmiImport.range().start.index;
      const impEnd = wagmiImport.range().end.index;
      if (nodeStart >= impStart && nodeStart <= impEnd) continue;
      const range = node.range();
      edits.push({ startPos: range.start.index, endPos: range.end.index, insertedText: "createConfig" });
    }
  }

  // ── 3. configureChains → TODO ────────────────────────────────────────────
  if (hasConfigureChains) {
    const calls = rootNode.findAll({ rule: { pattern: "configureChains($$$ARGS)" } });
    for (const call of calls) {
      let stmtNode = call.parent();
      while (stmtNode) {
        const k = stmtNode.kind();
        if (k === "lexical_declaration" || k === "variable_declaration" || k === "expression_statement") break;
        stmtNode = stmtNode.parent();
      }
      const insertPos = stmtNode ? stmtNode.range().start.index : call.range().start.index;
      edits.push({
        startPos: insertPos,
        endPos: insertPos,
        insertedText:
          "// TODO(wagmi-codemod): configureChains was removed in v2. " +
          "Replace with Viem transports in createConfig:\n" +
          "// const config = createConfig({ chains: [...], transports: { [chain.id]: http('RPC_URL') } })\n" +
          "// See: https://wagmi.sh/react/guides/migrate-from-v1-to-v2\n",
      });
    }
  }

  // ── 4. useNetwork() → useChainId() / useChains() ─────────────────────────
  let needsChainId = false;
  let needsChains = false;

  if (hasUseNetwork) {
    const useNetworkNodes = rootNode.findAll({ rule: { pattern: "useNetwork" } });

    for (const node of useNetworkNodes) {
      if (node.text() !== "useNetwork") continue;

      const callNode = node.parent();
      if (!callNode || callNode.kind() !== "call_expression") continue;

      const id = callNode.id();
      if (seen.has(id)) continue;
      seen.add(id);

      // Walk up to the full declaration statement
      const varDeclarator = callNode.parent();
      if (!varDeclarator) continue;
      const stmtNode = varDeclarator.parent();
      if (!stmtNode) continue;

      const stmtText = stmtNode.text();
      const stmtRange = stmtNode.range();

      // Find the destructuring pattern { ... } on the LHS of `=`
      const eqIdx = stmtText.indexOf("=");
      if (eqIdx === -1) {
        edits.push({
          startPos: stmtRange.start.index,
          endPos: stmtRange.start.index,
          insertedText: "// TODO(wagmi-codemod): useNetwork() was removed. Replace with useChainId() and/or useChains().\n",
        });
        continue;
      }

      const lhs = stmtText.slice(0, eqIdx);
      const braceStart = lhs.indexOf("{");
      const braceEnd = lhs.lastIndexOf("}");

      if (braceStart === -1 || braceEnd === -1) {
        // const network = useNetwork() — whole object pattern
        edits.push({
          startPos: stmtRange.start.index,
          endPos: stmtRange.start.index,
          insertedText: "// TODO(wagmi-codemod): useNetwork() was removed. Replace with useChainId() and/or useChains().\n",
        });
        continue;
      }

      const destructuredBlock = lhs.slice(braceStart + 1, braceEnd);
      // Extract keys, handling aliases like { chain: currentChain }
      const keys = destructuredBlock
        .split(",")
        .map((s) => s.trim().split(/[\s:]/)[0].trim())
        .filter(Boolean);

      const hasChain = keys.includes("chain");
      const hasChainsVar = keys.includes("chains");

      if (hasChain && hasChainsVar) {
        needsChainId = true;
        needsChains = true;
        edits.push({
          startPos: stmtRange.start.index,
          endPos: stmtRange.end.index,
          insertedText:
            "// TODO(wagmi-codemod): useNetwork().chain → useChainId() returns a number not a Chain object.\n" +
            "// Update usages: replace `chain.id` with `chainId`, `chain.name` needs a lookup.\n" +
            "const chainId = useChainId();\nconst chains = useChains()",
        });
      } else if (hasChainsVar) {
        needsChains = true;
        edits.push({
          startPos: stmtRange.start.index,
          endPos: stmtRange.end.index,
          insertedText: "const chains = useChains()",
        });
      } else if (hasChain) {
        needsChainId = true;
        edits.push({
          startPos: stmtRange.start.index,
          endPos: stmtRange.end.index,
          insertedText:
            "// TODO(wagmi-codemod): useNetwork().chain → useChainId() returns a number not a Chain object.\n" +
            "// Update usages: replace `chain.id` with `chainId`, `chain.name` needs a lookup.\n" +
            "const chainId = useChainId()",
        });
      } else {
        // Other destructured keys like { error, isLoading }
        edits.push({
          startPos: stmtRange.start.index,
          endPos: stmtRange.start.index,
          insertedText: "// TODO(wagmi-codemod): useNetwork() was removed. Replace with useChainId() and/or useChains().\n",
        });
      }
    }
  }

  // ── 5. Rebuild wagmi import (multiline-safe, type-import-safe) ───────────
  const importRange = wagmiImport.range();

  let newSpecifiers = specifiers
    .filter((s) => {
      const name = specifierName(s);
      return name !== "useNetwork" && name !== "configureChains";
    })
    .map((s) => {
      const name = specifierName(s);
      return name === "createClient" ? s.replace("createClient", "createConfig") : s;
    });

  if (needsChainId && !newSpecifiers.some((s) => specifierName(s) === "useChainId")) {
    newSpecifiers.push("useChainId");
  }
  if (needsChains && !newSpecifiers.some((s) => specifierName(s) === "useChains")) {
    newSpecifiers.push("useChains");
  }

  const quote = importText.includes(`'wagmi'`) ? "'" : '"';
  const newImport = `import { ${newSpecifiers.join(", ")} } from ${quote}wagmi${quote}`;

  edits.push({
    startPos: importRange.start.index,
    endPos: importRange.end.index,
    insertedText: newImport,
  });

  if (edits.length === 0) return null;
  return rootNode.commitEdits(edits);
};

export default transform;
