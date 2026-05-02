# Changelog

## [1.0.1] - 2026-04-29

### Fixed
- Transform 08: Removed hooks from STALE set that transform 01 already renames
  in-place (useSwitchNetwork, useContractRead, etc.) — prevented a bug where
  useSwitchChain would be called in code but not present in the import
- Transform 04: Removed `<`/`>` from depth tracking — prevents false splits
  caused by JSX elements or TypeScript comparison operators in hook args
- Transform 04: Fixed escape sequence handling in string-aware comma splitting
- Transform 01: Added detailed TODO for useContractWrite explaining that the
  entire contract config args must move from hook to writeContract() call site
- Transform 01: Added TODO for useWaitForTransactionReceipt hash type change
  (string → 0x${string})
- codemod.yaml: Fixed name to waleedbhattiii-wagmi-v1-to-v2, removed invalid
  capabilities field, bumped version to 1.0.1

### Added
- README: Complete rewrite with correct package name, accurate test commands,
  real-world benchmark results, and full what's-manual list
- Tests: write-contract-shape fixture for useContractWrite return shape TODO

## [1.0.0] - 2026-04-26

### Initial Release

First production release of the wagmi v1 → v2 migration codemod.

#### What's automated (8 transforms)

- **Hook renames**: All deprecated wagmi v1 hooks renamed to v2 equivalents
- **Provider rename**: `<WagmiConfig>` → `<WagmiProvider>`
- **Prepare hooks**: `usePrepareContractWrite` → `useSimulateContract`
- **Query params**: `enabled`, `staleTime`, etc. moved into `query: {}`
- **Watch prop**: Removed (preserved on `useBlockNumber` and `useBlock`)
- **Connectors**: Class instantiation → factory functions
- **Config API**: `createClient` → `createConfig`, `useNetwork` → `useChainId`/`useChains`
- **Import cleanup**: Stale v1 specifiers removed (multiline + type imports)

#### Coverage

Tested on official wagmi v1 examples (`wevm/wagmi@1.x`):
- 27 files scanned, 10 changed, ~85% automated, 0 false positives
