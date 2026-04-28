import { useBalance, useReadContract, useBlockNumber } from 'wagmi';

function Component({ address }: { address: `0x${string}` }) {
  // watch should be REMOVED from useBalance (not supported in v2)
  // TODO(wagmi-codemod): 'watch' prop removed in v2. Use useBlockNumber + useEffect to refetch:
//   const { data: blockNumber } = useBlockNumber({ watch: true })
//   useEffect(() => { refetch() }, [blockNumber])
const { data: balance, refetch } = useBalance({
    address});

  // watch should be REMOVED from useReadContract (not supported in v2)
  // TODO(wagmi-codemod): 'watch' prop removed in v2. Use useBlockNumber + useEffect to refetch:
//   const { data: blockNumber } = useBlockNumber({ watch: true })
//   useEffect(() => { refetch() }, [blockNumber])
const { data } = useReadContract({
    address,
    abi: erc20ABI,
    functionName: 'totalSupply'});

  // watch should be KEPT on useBlockNumber (still valid in v2)
  const { data: blockNumber } = useBlockNumber({ watch: true });

  return null;
}
