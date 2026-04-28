import { injected, metaMask, walletConnect } from 'wagmi/connectors';

const connectors = [
  metaMask(),
  walletConnect({ options: { projectId: 'abc123' } }),
  injected(),
];
