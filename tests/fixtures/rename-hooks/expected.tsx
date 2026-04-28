import {
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useReadContracts,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useWalletClient,
  usePublicClient,
  useEstimateFeesPerGas,
} from 'wagmi';

function Component() {
  const { data } = useReadContract({ address: '0x1', abi, functionName: 'name' });
  // TODO(wagmi-codemod): useWriteContract return shape changed.
// Rename: write → writeContract, writeAsync → writeContractAsync
const { write } = useWriteContract({ address: '0x1', abi, functionName: 'mint' });
  // TODO(wagmi-codemod): useWalletClient returns a Viem WalletClient, not an ethers Signer.
// Update all code that uses the result as an ethers Signer.
const { data: signer } = useWalletClient();
  const provider = usePublicClient();
  const { data: fee } = useEstimateFeesPerGas();
  const { isLoading } = useWaitForTransactionReceipt({ hash });
  // TODO(wagmi-codemod): useSwitchChain return shape changed.
// Rename destructured result: switchNetwork → switchChain, switchNetworkAsync → switchChainAsync
const { switchNetwork } = useSwitchChain();
  return null;
}
