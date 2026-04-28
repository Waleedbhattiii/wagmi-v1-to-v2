import { MetaMaskConnector } from '@wagmi/core/connectors/metaMask';
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect';

const connectors = [
  new MetaMaskConnector({ chains }),
  new WalletConnectConnector({ chains, options: { projectId: 'abc' } }),
];
