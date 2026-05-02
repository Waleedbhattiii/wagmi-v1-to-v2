import { useWriteContract } from 'wagmi';

function MintButton() {
  // TODO(wagmi-codemod): useWriteContract API changed significantly.
// 1. Rename: write → writeContract, writeAsync → writeContractAsync
// 2. Contract config (address, abi, functionName, args) moves from hook args to writeContract() call site.
//    Before: const { write } = useContractWrite({ address, abi, functionName }); write()
//    After:  const { writeContract } = useWriteContract(); writeContract({ address, abi, functionName, args })
const { write, writeAsync } = useWriteContract({
    address: '0x0000000000000000000000000000000000000001',
    abi: mintABI,
    functionName: 'mint',
  });
  return <button onClick={() => write?.()}>Mint</button>;
}
