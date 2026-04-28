import { useContractWrite } from 'wagmi';

function MintButton() {
  const { write, writeAsync } = useContractWrite({
    address: '0x1',
    abi: mintABI,
    functionName: 'mint',
  });
  return <button onClick={() => write?.()}>Mint</button>;
}
