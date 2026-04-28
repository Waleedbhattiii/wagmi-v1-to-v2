import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi';

function MintButton({ address }: { address: `0x${string}` }) {
  const { config } = usePrepareContractWrite({
    address,
    abi: mintABI,
    functionName: 'mint',
    enabled: !!address,
  });

  const { write, data } = useContractWrite(config);
  const { isLoading } = useWaitForTransaction({ hash: data?.hash });

  return (
    <button disabled={!write || isLoading} onClick={() => write?.()}>
      {isLoading ? 'Minting...' : 'Mint'}
    </button>
  );
}
