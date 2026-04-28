# Changelog

All notable changes to the `wagmi/v1-to-v2` codemod are documented here.

## [1.0.0] - 2026-04-26

### Initial Release

First production release of the wagmi v1 → v2 migration codemod.

#### What's automated (8 transforms)

- **Hook renames**: All deprecated wagmi v1 hooks renamed to their v2 equivalents
  - `useContractRead` → `useReadContract`
  - `useContractWrite` → `useWriteContract`
  - `useContractEvent` → `useWatchContractEvent`
  - `useContractReads` → `useReadContracts`
  - `useContractInfiniteReads` → `useInfiniteReadContracts`
  - `useWaitForTransaction` → `useWaitForTransactionReceipt`
  - `useSwitchNetwork` → `useSwitchChain`
  - `useSigner` → `useWalletClient`
  - `useProvider` → `usePublicClient`
  - `useWebSocketProvider` → `usePublicClient`
  - `useFeeData` → `useEstimateFeesPerGas`

- **Provider rename**: `<WagmiConfig>` → `<WagmiProvider>`

- **Prepare hooks**: `usePrepareContractWrite` → `useSimulateContract`, `usePrepareSendTransaction` → `useEstimateGas`

- **Query params**: `enabled`, `staleTime`, `cacheTime` etc. moved into `query: {}` property

- **Watch prop**: Removed from hooks that dropped it in v2 (preserved on `useBlockNumber` and `useBlock`)

- **Connectors**: `new MetaMaskConnector({ chains })` → `metaMask()`, etc.

- **Config API**: `createClient` → `createConfig`, `useNetwork` → `useChainId`/`useChains`, `configureChains` flagged with TODO

- **Import cleanup**: Removes stale v1 import specifiers

#### What requires AI/manual work (flagged with TODO)

- `configureChains` → Viem transport setup (provider-specific)
- `watch: true` removal → `useBlockNumber + useEffect` pattern
- `usePrepareContractWrite` destructuring → `config` → `data.request`
- `useNetwork().chain` → `useChainId()` returns number not Chain object
- `useSwitchChain` return shape → `switchNetwork` → `switchChain`
- `useWalletClient` return type → Viem `WalletClient` not ethers `Signer`

#### Coverage

Tested on official wagmi v1 examples (`wevm/wagmi@1.x` branch):
- 27 files scanned
- 10 files changed automatically
- ~85% of migration patterns automated
- 5 TODO comments added for AI/manual resolution
