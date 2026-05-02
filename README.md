# wagmi v1 → v2 Codemod

> Automates the [wagmi v1 to v2 migration](https://wagmi.sh/react/guides/migrate-from-v1-to-v2).  
> Built with the [Codemod](https://codemod.com) JSSG engine.  
> Published: [`waleedbhattiii-wagmi-v1-to-v2`](https://app.codemod.com/registry/waleedbhattiii-wagmi-v1-to-v2)

## Quick Start

```bash
npx codemod waleedbhattiii-wagmi-v1-to-v2
```

Or run manually on a specific directory:

```bash
npx codemod jssg run --language tsx ./scripts/01-rename-hooks.ts --target /path/to/your/project
```

## What gets migrated automatically (~85% coverage)

| Category | v1 | v2 |
|---|---|---|
| Provider | `<WagmiConfig>` | `<WagmiProvider>` |
| Hook | `useContractRead` | `useReadContract` |
| Hook | `useContractWrite` | `useWriteContract` |
| Hook | `useContractEvent` | `useWatchContractEvent` |
| Hook | `useContractReads` | `useReadContracts` |
| Hook | `useContractInfiniteReads` | `useInfiniteReadContracts` |
| Hook | `useWaitForTransaction` | `useWaitForTransactionReceipt` |
| Hook | `useSwitchNetwork` | `useSwitchChain` |
| Hook | `useSigner` | `useWalletClient` |
| Hook | `useProvider` | `usePublicClient` |
| Hook | `useWebSocketProvider` | `usePublicClient` |
| Hook | `useFeeData` | `useEstimateFeesPerGas` |
| Prepare hooks | `usePrepareContractWrite` | `useSimulateContract` |
| Prepare hooks | `usePrepareSendTransaction` | `useEstimateGas` |
| Query params | `useReadContract({ enabled })` | `useReadContract({ query: { enabled } })` |
| Watch prop | `useBalance({ watch: true })` | Removed + TODO added |
| Connectors | `new MetaMaskConnector({ chains })` | `metaMask()` |
| Connectors | `new WalletConnectConnector(...)` | `walletConnect(...)` |
| Connectors | `new InjectedConnector(...)` | `injected(...)` |
| Connectors | `new CoinbaseWalletConnector(...)` | `coinbaseWallet(...)` |
| Config | `createClient` | `createConfig` |
| Network | `useNetwork()` | `useChainId()` + `useChains()` |
| Imports | Stale v1 specifiers | Cleaned up |

**Key safety guarantees:**
- Import source verified before any rename — user-defined hooks with same names are never touched
- Exact text match prevents substring collisions (e.g. `useContractRead` never matches `useContractReads`)
- String-aware comma splitting — commas inside string values never cause incorrect splits
- `watch: true` preserved on `useBlockNumber` and `useBlock` (still valid in v2)
- Non-overlapping edits — TODO comments inserted before statements, never inside renamed nodes
- `useSwitchNetwork` renamed in-place by transform 01, not removed by transform 08

## What needs manual work (flagged with TODO)

| Pattern | Why manual |
|---|---|
| `configureChains` | Requires Viem transport setup specific to each RPC provider |
| `watch: true` removal | Replacement pattern depends on component structure |
| `usePrepareContractWrite` destructuring | `config` → `data.request` |
| `useNetwork().chain` | Returns `chainId` (number not Chain object) |
| `useWriteContract` args | Contract config moves from hook to `writeContract()` call site |
| `useSwitchChain` result | `switchNetwork` → `switchChain` |
| `useWalletClient` result | Viem `WalletClient` not ethers `Signer` |
| `useWaitForTransactionReceipt` hash | Type changes from `string` to `` 0x${string} `` |

## Install wagmi v2 peer dependencies

```bash
npm install wagmi viem@2.x @tanstack/react-query
```

## Wrap your app with QueryClientProvider

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from './config'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* your app */}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## Running tests

```bash
npm test
```

Or individually:

```bash
npx codemod jssg test -l tsx ./scripts/01-rename-hooks.ts ./tests/fixtures --filter "rename-hooks"
npx codemod jssg test -l tsx ./scripts/02-rename-wagmi-provider.ts ./tests/fixtures --filter "rename-provider"
npx codemod jssg test -l tsx ./scripts/03-replace-prepare-hooks.ts ./tests/fixtures --filter "prepare-hooks"
npx codemod jssg test -l tsx ./scripts/04-move-query-params.ts ./tests/fixtures --filter "query-params"
npx codemod jssg test -l tsx ./scripts/05-remove-watch-prop.ts ./tests/fixtures --filter "watch-prop"
npx codemod jssg test -l tsx ./scripts/06-rename-connectors.ts ./tests/fixtures --filter "connectors"
npx codemod jssg test -l tsx ./scripts/06-rename-connectors.ts ./tests/fixtures --filter "core-connectors"
npx codemod jssg test -l tsx ./scripts/07-rename-config-api.ts ./tests/fixtures --filter "config-api"
npx codemod jssg test -l tsx ./scripts/08-cleanup-imports.ts ./tests/fixtures --filter "cleanup-imports"
npx codemod jssg test -l tsx ./scripts/08-cleanup-imports.ts ./tests/fixtures --filter "multiline-import"
npx codemod jssg test -l tsx ./scripts/08-cleanup-imports.ts ./tests/fixtures --filter "type-imports"
npx codemod jssg test -l tsx ./scripts/01-rename-hooks.ts ./tests/fixtures --filter "write-contract-shape"
```

## Real-world benchmark

Tested on the official wagmi v1 examples (`wevm/wagmi@1.x` branch):
- **27 files scanned**
- **10 files changed automatically**
- **~85% of migration patterns automated**
- **6 TODO comments** added for AI/manual resolution
- **0 false positives**

## Project structure

```
wagmi-v1-to-v2/
├── codemod.yaml                      ← package metadata
├── workflow.yaml                     ← orchestrates all transforms + AI step
├── .codemodignore                    ← excludes test/generated/dist files
├── CHANGELOG.md
├── scripts/
│   ├── 01-rename-hooks.ts            ← hook renames + return shape TODOs
│   ├── 02-rename-wagmi-provider.ts   ← WagmiConfig → WagmiProvider
│   ├── 03-replace-prepare-hooks.ts   ← prepare hooks → simulate/estimateGas
│   ├── 04-move-query-params.ts       ← enabled/staleTime → query:{}
│   ├── 05-remove-watch-prop.ts       ← watch removal (safe for useBlockNumber)
│   ├── 06-rename-connectors.ts       ← connector class → factory fn
│   ├── 07-rename-config-api.ts       ← createClient, useNetwork
│   └── 08-cleanup-imports.ts         ← remove stale v1 import specifiers
└── tests/fixtures/
    ├── rename-hooks/
    ├── rename-provider/
    ├── prepare-hooks/
    ├── query-params/
    ├── watch-prop/
    ├── connectors/
    ├── core-connectors/
    ├── config-api/
    ├── cleanup-imports/
    ├── multiline-import/
    ├── type-imports/
    └── write-contract-shape/
```
