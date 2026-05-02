import { useContractWrite } from 'wagmi';

function MintButton() {
  const { write, writeAsync } = useContractWrite({
    address: '0x0000000000000000000000000000000000000001',
    abi: mintABI,
    functionName: 'mint',
  });
  return <button onClick={() => write?.()}>Mint</button>;
}
