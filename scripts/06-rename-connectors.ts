import type { Transform } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * Transform 06: Rename v1 connector classes to v2 factory functions.
 *
 * Fixes:
 * - removeChainsFromObject now tracks < > for TypeScript generics
 * - Only matches imports from specific connector paths (not bare 'wagmi')
 * - Connector import consolidation order is deterministic (alphabetical)
 */

const CONNECTOR_MAP: Record<string, string> = {
  CoinbaseWalletConnector: "coinbaseWallet",
  InjectedConnector: "injected",
  LedgerConnector: "ledger",
  MetaMaskConnector: "metaMask",
  SafeConnector: "safe",
  WalletConnectConnector: "walletConnect",
};

const CONNECTOR_IMPORT_PATHS = [
  "wagmi/connectors/coinbaseWallet",
  "wagmi/connectors/injected",
  "wagmi/connectors/ledger",
  "wagmi/connectors/metaMask",
  "wagmi/connectors/safe",
  "wagmi/connectors/walletConnect",
  "@wagmi/core/connectors/coinbaseWallet",
  "@wagmi/core/connectors/injected",
  "@wagmi/core/connectors/ledger",
  "@wagmi/core/connectors/metaMask",
  "@wagmi/core/connectors/safe",
  "@wagmi/core/connectors/walletConnect",
];

export function getSelector() {
  return {
    rule: {
      any: Object.keys(CONNECTOR_MAP).map((name) => ({ pattern: name })),
    },
  };
}

/**
 * Remove the `chains` property from an object literal text.
 * Correctly handles TypeScript generics (< >) in property values.
 */
function removeChainsFromObject(objText: string): string {
  // Strip outer braces
  const inner = objText.slice(1, objText.lastIndexOf("}")).trim();
  if (!inner) return "";

  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  let stringChar = "";
  let angleDepth = 0;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const prev = i > 0 ? inner[i - 1] : "";

    if (!inString && (ch === "'" || ch === '"' || ch === "`")) {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }
    if (inString) {
      current += ch;
      if (ch === "\\" && prev !== "\\") continue;
      if (ch === stringChar && prev !== "\\") { inString = false; stringChar = ""; }
      continue;
    }

    if (ch === "<") angleDepth++;
    else if (ch === ">") angleDepth--;
    else if (ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === "}" || ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0 && angleDepth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  const filtered = parts.filter((p) => {
    // Match "chains" as a shorthand property or "chains:" key
    const key = p.split(/[\s:{<(]/)[0].trim();
    return key !== "chains";
  });

  if (filtered.length === 0) return "";
  return `{ ${filtered.join(", ")} }`;
}

const transform: Transform<TSX> = (root) => {
  const rootNode = root.root();
  const importedConnectors = new Set<string>();
  const seen = new Set<number>();
  const edits: { startPos: number; endPos: number; insertedText: string }[] = [];
  let lastOldImportEnd = -1;

  // Detect connectors imported from specific connector paths only
  for (const importPath of CONNECTOR_IMPORT_PATHS) {
    for (const oldName of Object.keys(CONNECTOR_MAP)) {
      const found = rootNode.find({
        rule: {
          any: [
            { pattern: `import { ${oldName} } from '${importPath}'` },
            { pattern: `import { $$$A, ${oldName}, $$$B } from '${importPath}'` },
            { pattern: `import { ${oldName} } from "${importPath}"` },
            { pattern: `import { $$$A, ${oldName}, $$$B } from "${importPath}"` },
          ],
        },
      });
      if (found) importedConnectors.add(oldName);
    }
  }

  if (importedConnectors.size === 0) return null;

  // Remove old connector import statements
  for (const importPath of CONNECTOR_IMPORT_PATHS) {
    for (const oldName of importedConnectors) {
      const stmts = rootNode.findAll({
        rule: {
          any: [
            { pattern: `import { ${oldName} } from '${importPath}'` },
            { pattern: `import { $$$A, ${oldName}, $$$B } from '${importPath}'` },
            { pattern: `import { ${oldName} } from "${importPath}"` },
            { pattern: `import { $$$A, ${oldName}, $$$B } from "${importPath}"` },
          ],
        },
      });

      for (const stmt of stmts) {
        const id = stmt.id();
        if (seen.has(id)) continue;
        seen.add(id);

        const range = stmt.range();
        if (range.end.index + 1 > lastOldImportEnd) {
          lastOldImportEnd = range.end.index + 1;
        }
        edits.push({
          startPos: range.start.index,
          endPos: range.end.index + 1,
          insertedText: "",
        });
      }
    }
  }

  // Add unified import — sorted alphabetically for deterministic output
  const newNames = Array.from(importedConnectors)
    .sort()
    .map((n) => CONNECTOR_MAP[n])
    .join(", ");

  if (lastOldImportEnd > -1) {
    edits.push({
      startPos: lastOldImportEnd,
      endPos: lastOldImportEnd,
      insertedText: `import { ${newNames} } from 'wagmi/connectors';\n`,
    });
  }

  // Replace new ConnectorClass({...}) with connectorFn({...})
  for (const [oldName, newName] of Object.entries(CONNECTOR_MAP)) {
    if (!importedConnectors.has(oldName)) continue;

    const newExprs = rootNode.findAll({
      rule: { pattern: `new ${oldName}($$$ARGS)` },
    });

    for (const expr of newExprs) {
      const id = expr.id();
      if (seen.has(id)) continue;
      seen.add(id);

      const exprText = expr.text();
      const range = expr.range();
      const parenIdx = exprText.indexOf("(");

      if (parenIdx === -1) {
        edits.push({ startPos: range.start.index, endPos: range.end.index, insertedText: `${newName}()` });
        continue;
      }

      const innerArg = exprText.slice(parenIdx + 1, exprText.length - 1).trim();
      if (!innerArg) {
        edits.push({ startPos: range.start.index, endPos: range.end.index, insertedText: `${newName}()` });
        continue;
      }

      const cleaned = removeChainsFromObject(innerArg);
      const result = !cleaned || cleaned === "{}" || cleaned === "{ }"
        ? `${newName}()`
        : `${newName}(${cleaned})`;

      edits.push({ startPos: range.start.index, endPos: range.end.index, insertedText: result });
    }

    // Rename remaining identifier references
    const refs = rootNode.findAll({ rule: { pattern: oldName } });
    for (const node of refs) {
      const id = node.id();
      if (seen.has(id)) continue;
      seen.add(id);
      if (node.text() !== oldName) continue;
      const range = node.range();
      edits.push({ startPos: range.start.index, endPos: range.end.index, insertedText: newName });
    }
  }

  if (edits.length === 0) return null;
  return rootNode.commitEdits(edits);
};

export default transform;
