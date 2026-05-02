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
  const { data } = useReadContract({ address: '0x0000000000000000000000000000000000000001', abi, functionName: 'name' });
  // TODO(wagmi-codemod): useWriteContract API changed significantly.
// 1. Rename: write → writeContract, writeAsync → writeContractAsync
// 2. Contract config (address, abi, functionName, args) moves from hook args to writeContract() call site.
//    Before: const { write } = useContractWrite({ address, abi, functionName }); write()
//    After:  const { writeContract } = useWriteContract(); writeContract({ address, abi, functionName, args })
const { write } = useWriteContract({ address: '0x0000000000000000000000000000000000000001', abi, functionName: 'mint' });
  // TODO(wagmi-codemod): useWalletClient returns a Viem WalletClient, not an ethers Signer.
// Update all code that uses the result as an ethers Signer.
const { data: signer } = useWalletClient();
  const provider = usePublicClient();
  const { data: fee } = useEstimateFeesPerGas();
  // TODO(wagmi-codemod): useWaitForTransactionReceipt: hash type changed from string to 0x${string}.
// Ensure hash is typed as `0x${string} | undefined` not `string | undefined`.
const { isLoading } = useWaitForTransactionReceipt({ hash });
  // TODO(wagmi-codemod): useSwitchChain return shape changed.
// Rename destructured result: switchNetwork → switchChain, switchNetworkAsync → switchChainAsync
const { switchNetwork } = useSwitchChain();
  return null;
}
