import { useReadContract, useBalance } from 'wagmi';

function Component({ address }: { address: `0x${string}` }) {
  const { data: supply } = useReadContract({
    address,
    abi: erc20ABI,
    functionName: 'totalSupply',
    query: {
      enabled: Boolean(address),
      staleTime: 5_000,
    },
  });

  // No query params — should NOT be changed
  const { data: balance } = useBalance({
    address,
  });

  return null;
}
