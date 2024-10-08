import http from 'serverless-http';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { isAddress } from 'ethers';
import { escapeNumberForTg, lc } from './utils/String.js';
import getUserAddresses from './data/getUserAddresses.js';
import saveUserAddresses from './data/saveUserAddresses.js';
import { MAX_ADDRESSES_PER_USER } from './constants/BotConstants.js';
import getAllCurveLendingVaults from './utils/data/curve-lending-vaults.js';
import { arrayToHashmap, flattenArray, removeNulls } from './utils/Array.js';
import LENDING_CONTROLLER_ABI from './abis/LendingController.json' assert { type: 'json' };
import LENDING_AMM_ABI from './abis/LendingAmm.json' assert { type: 'json' };
import multiCall from './utils/Calls.js';
import groupBy from 'lodash.groupby';
import { uintToBN } from './utils/Parsing.js';
import getAllCrvusdMarkets from './utils/data/crvusd-markets.js';

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

const HELP_TEXT = `@CurveLendMonitorBot allows you to view loan information from [Curve Lend](https://lend.curve.fi/) and [crvUSD](https://crvusd.curve.fi/) for any address you want; it’ll also notify you of important changes to these loans health ratios\\.

Here are the available commands:

\\- \`/add 0xADDRESS\`: Start monitoring an address; the bot will notify you of important changes to health ratios of this address’ loans on Curve Lend and crvUSD
\\- \`/remove 0xADDRESS\`: Stop monitoring an address
\\- /list: List all addresses you’ve added
\\- /view: View loan information for all addresses you’ve added
\\- /help: List all available commands
`;

const TELEGRAM_MESSAGE_OPTIONS = {
  link_preview_options: { is_disabled: true },
  parse_mode: 'MarkdownV2',
};

// Middleware
bot.use(async (ctx, next) => {
  if (ctx?.update?.message?.chat?.type !== 'private') ctx.reply('This bot only accepts direct messages from Telegram users');
  else await next();
});

bot.command('add', async (ctx) => {
  const address = ctx.payload.trim();
  const telegramUserId = ctx.update.message.from.id;

  // Validate Ethereum address
  const isValidAddress = isAddress(address) && !address.startsWith('XE'); // Exclude ICAP addresses
  if (!isValidAddress) {
    ctx.reply('Error adding address: submitted address doens’t look like a valid Ethereum address');
    return;
  }

  const userAddresses = await getUserAddresses(telegramUserId);

  const isAddressAlreadyAdded = userAddresses.some((adressData) => adressData.address === lc(address));
  if (isAddressAlreadyAdded) {
    ctx.reply('Address already in your watchlist!');
    return;
  }

  if (userAddresses.length >= MAX_ADDRESSES_PER_USER) {
    ctx.reply(`Error adding address: this bot is already monitoring ${MAX_ADDRESSES_PER_USER} addresses for you, which is the maximum it’s allowed to do. If you have a legitimate use-case for monitoring more addresses than that, please contact us on Discord, Twitter, GitHub`);
    return;
  }

  const updatedAddresses = [
    ...userAddresses,
    { address: lc(address), last_checked_ts: 0 },
  ];
  await saveUserAddresses(telegramUserId, updatedAddresses);

  ctx.reply(`Address \`${address}\` added\\!\n\nAll addresses now in your watchlist:\n\n${updatedAddresses.map(({ address }) => `\\- \`${address}\``).join("\n")}`, TELEGRAM_MESSAGE_OPTIONS);
});

bot.command('remove', async (ctx) => {
  const address = ctx.payload.trim();
  const telegramUserId = ctx.update.message.from.id;

  // Validate Ethereum address
  const isValidAddress = isAddress(address) && !address.startsWith('XE'); // Exclude ICAP addresses
  if (!isValidAddress) {
    ctx.reply('Error removing address: submitted address doens’t look like a valid Ethereum address');
    return;
  }

  const userAddresses = await getUserAddresses(telegramUserId);

  const isAddressFound = userAddresses.some((adressData) => adressData.address === lc(address));
  if (!isAddressFound) {
    ctx.reply('Error removing address: this address isn’t in your watchlist');
    return;
  }

  const updatedAddresses = userAddresses.filter((adressData) => adressData.address !== lc(address));
  await saveUserAddresses(telegramUserId, updatedAddresses);

  if (updatedAddresses.length > 0) {
    ctx.reply(`Address \`${address}\` removed\\!\n\nAll addresses now in your watchlist:\n\n${updatedAddresses.map(({ address }) => `\\- \`${address}\``).join("\n")}`, TELEGRAM_MESSAGE_OPTIONS);
  } else {
    ctx.reply(`Address \`${address}\` removed\\! Your watchlist is now empty`, TELEGRAM_MESSAGE_OPTIONS);
  }
});

bot.command('list', async (ctx) => {
  const telegramUserId = ctx.update.message.from.id;
  const userAddresses = await getUserAddresses(telegramUserId);

  if (userAddresses.length > 0) {
    ctx.reply(`All addresses in your watchlist:\n\n${userAddresses.map(({ address }) => `\\- \`${address}\``).join("\n")}`, TELEGRAM_MESSAGE_OPTIONS);
  } else {
    ctx.reply('Your watchlist is empty');
  }
});

bot.command('view', async (ctx) => {
  const telegramUserId = ctx.update.message.from.id;
  const userAddresses = await getUserAddresses(telegramUserId);

  if (userAddresses.length > 0) {
    const curveLendingVaults = await getAllCurveLendingVaults('ethereum');
    const crvusdMarkets = await getAllCrvusdMarkets();
    const allMarkets = [
      ...curveLendingVaults.map((o) => ({ ...o, marketType: 'lend' })),
      ...crvusdMarkets.map((o) => ({ ...o, marketType: 'crvusd' })),
    ];

    const userLendingData = await multiCall(flattenArray(flattenArray(
      allMarkets.map((lendingVault) => {
        const {
          controllerAddress,
          ammAddress,
          address: lendingVaultAddress,
        } = lendingVault;

        return (
          userAddresses.map(({ address: userAddress }) => [{
            address: controllerAddress,
            abi: LENDING_CONTROLLER_ABI,
            methodName: 'loan_exists',
            params: [userAddress],
            metaData: { userAddress, lendingVaultAddress, type: 'doesLoanExist' },
          }, {
            address: controllerAddress,
            abi: LENDING_CONTROLLER_ABI,
            methodName: 'user_state',
            params: [userAddress],
            metaData: { userAddress, lendingVaultAddress, type: 'userState' },
          }, {
            address: controllerAddress,
            abi: LENDING_CONTROLLER_ABI,
            methodName: 'user_prices',
            params: [userAddress],
            metaData: { userAddress, lendingVaultAddress, type: 'priceRange' },
          }, {
            address: controllerAddress,
            abi: LENDING_CONTROLLER_ABI,
            methodName: 'health',
            params: [userAddress],
            metaData: { userAddress, lendingVaultAddress, type: 'health' },
          }, {
            address: ammAddress,
            abi: LENDING_AMM_ABI,
            methodName: 'read_user_tick_numbers',
            params: [userAddress],
            metaData: { userAddress, lendingVaultAddress, type: 'bandRange' },
          }, {
            address: ammAddress,
            abi: LENDING_AMM_ABI,
            methodName: 'active_band',
            metaData: { userAddress, lendingVaultAddress, type: 'currentAmmBand' },
          }])
        );
      })
    )));

    const structuredLendingData = arrayToHashmap(
      Object.entries(groupBy(userLendingData, 'metaData.userAddress')).map(([userAddress, userData]) => [
        userAddress,
        arrayToHashmap(
          Object.entries(groupBy(userData, 'metaData.lendingVaultAddress')).map(([lendingVaultAddress, lendingVaultData]) => [
            lendingVaultAddress,
            arrayToHashmap(
              Object.entries(groupBy(lendingVaultData, 'metaData.type')).map(([dataType, [{ data, metaData }]]) => {
                const vaultData = allMarkets.find(({ address }) => address === metaData.lendingVaultAddress);

                return [
                  dataType,
                  (
                    dataType === 'health' ? uintToBN(data, 18).dp(6) :
                      dataType === 'bandRange' ? data.map((n) => Number(n)).sort() : // Always asc order
                        dataType === 'currentAmmBand' ? Number(data) :
                          dataType === 'priceRange' ? data.map((price, i) => uintToBN(price, vaultData.assets.collateral.decimals).dp(6)) :
                            dataType === 'userState' ? {
                              atRiskCollat: uintToBN(data[0], vaultData.assets.collateral.decimals).dp(6),
                              atRiskBorrowed: uintToBN(data[1], vaultData.assets.borrowed.decimals).dp(6),
                              debt: uintToBN(data[2], vaultData.assets.borrowed.decimals).dp(6),
                              bandCount: Number(data[3]),
                            } :
                              data
                  ),
                ];
              })
            ),
          ]).filter(([, { doesLoanExist }]) => doesLoanExist === true)
        ),
      ])
    );

    ctx.reply(`
      Your positions:
      ${Object.entries(structuredLendingData).map(([userAddress, addressPositions]) => (`
\\- On \`${userAddress}\`: ${Object.entries(addressPositions).length === 0 ?
        'None' :
        Object.entries(addressPositions).map(([lendingVaultAddress, positionData]) => {
          const vaultData = allMarkets.find(({ address }) => address === lendingVaultAddress);
          const isInHardLiq = positionData.health.lt(0);
          const isInSoftLiq = (
            !isInHardLiq &&
            positionData.currentAmmBand >= positionData.bandRange[0] &&
            positionData.currentAmmBand <= positionData.bandRange[1]
          );

          const textLines = removeNulls([
            `State: *${isInHardLiq ? 'Hard Liquidation ⚠️' : isInSoftLiq ? 'Soft Liquidation ℹ️' : 'healthy ✅'}*`,
            (isInHardLiq || isInSoftLiq) ? `Health: *${escapeNumberForTg(positionData.health.times(100).dp(4))}%*` : null,
            (isInHardLiq || isInSoftLiq) ? `Currently at risk: *${escapeNumberForTg(positionData.userState.atRiskCollat.dp(4))} ${vaultData.assets.collateral.symbol} and ${escapeNumberForTg(positionData.userState.atRiskBorrowed.dp(4))} ${vaultData.assets.borrowed.symbol}*` : null,
            `Your collateral’s band range: *${escapeNumberForTg(positionData.bandRange[0])}→${escapeNumberForTg(positionData.bandRange[1])}* _\\(approx\\. corresponding collateral price range: *${escapeNumberForTg(positionData.priceRange[0].dp(2))}→${escapeNumberForTg(positionData.priceRange[1].dp(2))}*\\)_`,
            `Current AMM band: *${escapeNumberForTg(positionData.currentAmmBand)}*`,
          ]);

          return (`\n  \\- Borrowing *${vaultData.assets.borrowed.symbol}* against *${vaultData.assets.collateral.symbol}* \\(${vaultData.marketType === 'lend' ? 'Curve Lend' : 'crvUSD market'}\\):\n     ${textLines.join("\n     ")}`);
        })}
      `)).join("")}
    `, TELEGRAM_MESSAGE_OPTIONS);
  } else {
    ctx.reply('Your watchlist is empty');
  }
});

bot.command('help', async (ctx) => ctx.reply(HELP_TEXT, TELEGRAM_MESSAGE_OPTIONS));

// Note: Telegraf is middleware-based, so it's important that this text handler is last
// in the list to act as a catch-all.
bot.on(message('text'), async (ctx) => ctx.reply(HELP_TEXT, TELEGRAM_MESSAGE_OPTIONS));

export const hookbot = http(bot.webhookCallback('/telegraf'));
