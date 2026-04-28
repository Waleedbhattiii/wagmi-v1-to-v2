import { WagmiConfig } from 'wagmi';
import { config } from './config';

function App() {
  return (
    <WagmiConfig config={config}>
      <main>Hello World</main>
    </WagmiConfig>
  );
}
