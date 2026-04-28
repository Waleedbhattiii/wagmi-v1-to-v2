# wagmi/v1-to-v2

> Automated codemod to migrate [wagmi](https://wagmi.sh) v1 → v2.  
> Built with the [Codemod](https://codemod.com) JSSG engine.

wagmi v2 redesigns core APIs around Viem and TanStack Query. This codemod automates **~85% of the migration** — all deterministic, mechanical changes — and adds precise `TODO` comments for the patterns that require human or AI judgment.

## Usage

```bash
npx codemod wagmi/v1-to-v2
```

Or run on a specific directory:

```bash
npx codemod workflow run -w . -t /path/to/your/project
```

## What gets migrated automatically

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

**Key safety feature:** All hook renames verify the import source is `'wagmi'` before firing. User-defined functions with the same name are never touched.

**Note:** `watch: true` on `useBlock` and `useBlockNumber` is intentionally preserved — it remains valid in v2.

## What still needs manual work (flagged with TODO)

| Pattern | Why manual |
|---|---|
| `watch: true` removal | Replacement pattern depends on component structure |
| `configureChains` | Requires Viem transport setup specific to each provider |
| `usePrepareContractWrite` destructuring | `config` → `data`, pass `data.request` to `writeContract()` |
| `useNetwork().chain` | Returns `chainId` (number), not a `Chain` object |

The AI step in `workflow.yaml` handles these automatically when you run with an API key:

```bash
LLM_API_KEY=your-key npx codemod workflow run -w . -t /path/to/project --param run_ai_step=true
```

## After running the codemod

Install the new peer dependencies:

```bash
npm install wagmi viem@2.x @tanstack/react-query
```

Wrap your app with `QueryClientProvider`:

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
npx codemod jssg test -l tsx ./scripts/01-rename-hooks.ts ./tests/rename-hooks
npx codemod jssg test -l tsx ./scripts/02-rename-wagmi-provider.ts ./tests/rename-provider
npx codemod jssg test -l tsx ./scripts/03-replace-prepare-hooks.ts ./tests/prepare-hooks
npx codemod jssg test -l tsx ./scripts/04-move-query-params.ts ./tests/query-params
npx codemod jssg test -l tsx ./scripts/05-remove-watch-prop.ts ./tests/watch-prop
npx codemod jssg test -l tsx ./scripts/06-rename-connectors.ts ./tests/connectors
npx codemod jssg test -l tsx ./scripts/07-rename-config-api.ts ./tests/config-api
npx codemod jssg test -l tsx ./scripts/08-cleanup-imports.ts ./tests/cleanup-imports
```

Or run all at once (requires package.json scripts setup):

```bash
npm test
```

## Testing on the official wagmi v1 examples

```bash
git clone --branch 1.x --depth 1 https://github.com/wevm/wagmi wagmi-v1-source
npx codemod workflow run -w . -t ./wagmi-v1-source/examples
```

## Publishing

```bash
npx codemod login
npx codemod publish
```

## Project structure

```
wagmi/v1-to-v2/
├── codemod.yaml                  ← package metadata
├── workflow.yaml                 ← orchestrates all 8 transforms + AI step
├── scripts/
│   ├── 01-rename-hooks.ts        ← hook 1-to-1 renames
│   ├── 02-rename-wagmi-provider.ts ← WagmiConfig → WagmiProvider
│   ├── 03-replace-prepare-hooks.ts ← prepare hooks → simulate/estimateGas
│   ├── 04-move-query-params.ts   ← enabled/staleTime → query: {}
│   ├── 05-remove-watch-prop.ts   ← watch removal (safe: preserves useBlockNumber)
│   ├── 06-rename-connectors.ts   ← connector class → factory fn
│   ├── 07-rename-config-api.ts   ← createClient, useNetwork
│   └── 08-cleanup-imports.ts     ← remove stale v1 import specifiers
└── tests/
    ├── rename-hooks/             ← input.tsx + expected.tsx
    ├── rename-provider/
    ├── prepare-hooks/
    ├── query-params/
    ├── watch-prop/
    ├── connectors/
    ├── config-api/
    └── cleanup-imports/
```
