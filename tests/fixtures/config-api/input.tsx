import { createClient, configureChains, useNetwork } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

const { chains, provider } = configureChains([mainnet, polygon], [publicProvider()]);

const client = createClient({
  autoConnect: true,
  provider,
});

function NetworkBadge() {
  const { chain } = useNetwork();
  return <span>{chain?.name}</span>;
}

function ChainList() {
  const { chains } = useNetwork();
  return <ul>{chains.map(c => <li key={c.id}>{c.name}</li>)}</ul>;
}
