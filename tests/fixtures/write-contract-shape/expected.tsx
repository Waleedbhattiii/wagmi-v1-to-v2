import { useWriteContract } from 'wagmi';

function MintButton() {
  // TODO(wagmi-codemod): useWriteContract return shape changed.
// Rename: write → writeContract, writeAsync → writeContractAsync
const { write, writeAsync } = useWriteContract({
    address: '0x1',
    abi: mintABI,
    functionName: 'mint',
  });
  return <button onClick={() => write?.()}>Mint</button>;
}
