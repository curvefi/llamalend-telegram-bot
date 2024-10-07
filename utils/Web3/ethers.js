/**
 * Ethers.js uses signature-aware method identifiers to make sure the right method
 * is called when an abi contains overloaded functions (functions with multiple
 * possible signatures). This utility automatically transforms a signature-less
 * method name like `add_liquidity` into its signature-aware counterpart like
 * `add_liquidity(uint256[2],uint256)`.
 */
const toSignatureAwareMethodName = ({ methodName, abi, params }) => {
  const abiEntries = abi.filter(({ name, type, inputs }) => (
    name === methodName &&
    type === 'function' &&
    inputs.length === params.length
  ));

  if (abiEntries.length === 0) {
    throw new Error(`toSignatureAwareMethodName error: no abi entry found for function "${methodName}" with ${params.length} params`);
  }

  if (abiEntries.length > 1) {
    throw new Error(`toSignatureAwareMethodName error: multiple abi entries found for function "${methodName}" with ${params.length} params. To avoid ambiguity, no signature-aware method name can be automatically generated. Please manually use the correct signature-aware method name instead.`);
  }

  return `${methodName}(${abiEntries[0].inputs.map(({ type, components }) => (
    type === 'tuple[]' ?
      `(${components.map(({ type }) => type).join(',')})[]` :
      type
  )).join(',')})`;
};

export {
  toSignatureAwareMethodName,
};
