import {
  useContractRead,
  useContractWrite,
  useContractEvent,
  useContractReads,
  useWaitForTransaction,
  useSwitchNetwork,
  useSigner,
  useProvider,
  useFeeData,
} from 'wagmi';

function Component() {
  const { data } = useContractRead({ address: '0x0000000000000000000000000000000000000001', abi, functionName: 'name' });
  const { write } = useContractWrite({ address: '0x0000000000000000000000000000000000000001', abi, functionName: 'mint' });
  const { data: signer } = useSigner();
  const provider = useProvider();
  const { data: fee } = useFeeData();
  const { isLoading } = useWaitForTransaction({ hash });
  const { switchNetwork } = useSwitchNetwork();
  return null;
}
