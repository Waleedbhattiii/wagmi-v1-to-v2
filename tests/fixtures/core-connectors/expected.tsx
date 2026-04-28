import { metaMask, walletConnect } from 'wagmi/connectors';

const connectors = [
  metaMask(),
  walletConnect({ options: { projectId: 'abc' } }),
];
