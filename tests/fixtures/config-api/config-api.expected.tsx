import { createConfig, useChainId, useChains } from 'wagmi'
import { mainnet, polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

// TODO(wagmi-codemod): configureChains was removed in v2. Replace with Viem transports in createConfig:
// createConfig({ chains: [...], transports: { [chain.id]: http() } })
// See: https://wagmi.sh/react/guides/migrate-from-v1-to-v2
const { chains, provider } = configureChains([mainnet, polygon], [publicProvider()]);

const client = createConfig({
  autoConnect: true,
  provider,
});

function NetworkBadge() {
  // TODO(wagmi-codemod): useNetwork().chain → useChainId() returns a number not a Chain object.
// Update usages: replace `chain.id` with `chainId`, `chain.name` needs a lookup.
const chainId = useChainId()
  return <span>{chain?.name}</span>;
}

function ChainList() {
  const chains = useChains()
  return <ul>{chains.map(c => <li key={c.id}>{c.name}</li>)}</ul>;
}
