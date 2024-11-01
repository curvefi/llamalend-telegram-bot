const getTextPositionRepresentation = (vaultData, textLines) => {
  return `\n  \\- Borrowing *${vaultData.assets.borrowed.symbol}* against *${vaultData.assets.collateral.symbol}* \\(${vaultData.marketType === 'lend' ? `Curve Lend on ${vaultData.network}` : 'crvUSD market'}\\)${typeof vaultData.externalUrl !== 'undefined' ? ` \\([link](${vaultData.externalUrl})\\)` : ''}:\n     ${textLines.join("\n     ")}`;
};

export {
  getTextPositionRepresentation,
};
