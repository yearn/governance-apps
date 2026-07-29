const ETHERSCAN_BASE_URL = "https://etherscan.io";
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export function isEthereumAddress(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

export function isEthereumTransactionHash(value: string): boolean {
  return TRANSACTION_HASH_PATTERN.test(value);
}

export function getEtherscanAddressUrl(address: string): string | null {
  return isEthereumAddress(address)
    ? `${ETHERSCAN_BASE_URL}/address/${address}`
    : null;
}

export function getEtherscanTransactionUrl(hash: string): string | null {
  return isEthereumTransactionHash(hash)
    ? `${ETHERSCAN_BASE_URL}/tx/${hash}`
    : null;
}
