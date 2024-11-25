import http from 'serverless-http';
import { message } from 'telegraf/filters';
import { isAddress } from 'ethers';
import { lc } from '../utils/String.js';
import getUserData from '../data/getUserData.js';
import { MAX_ADDRESSES_PER_USER } from '../constants/BotConstants.js';
import getUserOnchainData from '../data/getUserOnchainData.js';
import createUserWithAddress from '../data/createUserWithAddress.js';
import addUserAddress from '../data/addUserAddress.js';
import deleteUser from '../data/deleteUser.js';
import removeUserAddress from '../data/removeUserAddress.js';
import { bot, HELP_TEXT, TELEGRAM_MESSAGE_OPTIONS } from '../utils/Telegraf.js';
import notifyNewAddressAdded from '../utils/queues/sns-publisher.js';
import { getHumanReadableTimeDifference } from '../utils/Date.js';

// Middleware
bot.use(async (ctx, next) => {
  if (ctx?.update?.message?.chat?.type !== 'private') {
    await ctx.reply('This bot only accepts direct messages from Telegram users')
      .catch((err) => {
        if (err.code === 403) { /* Do nothing, unsupported use of the bot leading to expected error */ }
        else throw err;
      });
  } else {
    await next()
  };
});

bot.command('add', async (ctx) => {
  const address = ctx.payload.trim();
  const telegramUserId = ctx.update.message.from.id;

  // Validate Ethereum address
  const isValidAddress = isAddress(address) && !address.startsWith('XE'); // Exclude ICAP addresses
  if (!isValidAddress) {
    await ctx.reply('Error adding address: submitted address doens’t look like a valid Ethereum address');
    return;
  }

  const userData = await getUserData(telegramUserId);
  const userAddresses = Object.keys(userData.addresses);

  const isAddressAlreadyAdded = userAddresses.includes(lc(address));
  if (isAddressAlreadyAdded) {
    await ctx.reply('Address already in your watchlist!');
    return;
  }

  if (userAddresses.length >= MAX_ADDRESSES_PER_USER) {
    await ctx.reply(`Error adding address: this bot is already monitoring ${MAX_ADDRESSES_PER_USER} addresses for you, which is the maximum it’s allowed to do. If you have a legitimate use-case for monitoring more addresses than that, please contact us on Discord, Twitter, GitHub`);
    return;
  }

  let updatedAddresses;
  if (userAddresses.length === 0) {
    updatedAddresses = await createUserWithAddress({ telegramUserId, newAddress: lc(address) });
  } else {
    updatedAddresses = await addUserAddress({ telegramUserId, newAddress: lc(address) });
  }

  await notifyNewAddressAdded({ telegramUserId, newAddress: lc(address) });

  await ctx.reply(`Address \`${address}\` added\\!\n\nAll addresses now in your watchlist:\n\n${Object.keys(updatedAddresses).map((address) => `\\- \`${address}\``).join("\n")}`, TELEGRAM_MESSAGE_OPTIONS);
});

bot.command('remove', async (ctx) => {
  const address = ctx.payload.trim();
  const telegramUserId = ctx.update.message.from.id;

  // Validate Ethereum address
  const isValidAddress = isAddress(address) && !address.startsWith('XE'); // Exclude ICAP addresses
  if (!isValidAddress) {
    await ctx.reply('Error removing address: submitted address doens’t look like a valid Ethereum address');
    return;
  }

  const userData = await getUserData(telegramUserId);
  const userAddresses = Object.keys(userData.addresses);

  const isAddressFound = userAddresses.includes(lc(address));
  if (!isAddressFound) {
    await ctx.reply('Error removing address: this address isn’t in your watchlist');
    return;
  }

  if (userAddresses.length - 1 === 0) {
    await deleteUser({ telegramUserId });

    await ctx.reply(`Address \`${address}\` removed\\!\n\nYour watchlist is now empty`, TELEGRAM_MESSAGE_OPTIONS);
  } else {
    const updatedAddresses = await removeUserAddress({ telegramUserId, removedAddress: address });

    await ctx.reply(`Address \`${address}\` removed\\!\n\nAll addresses now in your watchlist:\n\n${Object.keys(updatedAddresses).map((address) => `\\- \`${address}\``).join("\n")}`, TELEGRAM_MESSAGE_OPTIONS);
  }
});

bot.command('list', async (ctx) => {
  const telegramUserId = ctx.update.message.from.id;
  const userData = await getUserData(telegramUserId);
  const userAddresses = Object.keys(userData.addresses);

  if (userAddresses.length > 0) {
    await ctx.reply(`All addresses in your watchlist:\n\n${userAddresses.map((address) => `\\- \`${address}\``).join("\n")}${userData.last_checked_ts > 0 ? `\n\nPositions on these addresses last checked ${getHumanReadableTimeDifference(userData.last_checked_ts)} ago` : ''}`, TELEGRAM_MESSAGE_OPTIONS);
  } else {
    await ctx.reply('Your watchlist is empty');
  }
});

bot.command('view', async (ctx) => {
  const telegramUserId = ctx.update.message.from.id;
  const userData = await getUserData(telegramUserId);
  const userAddresses = Object.keys(userData.addresses);

  if (userAddresses.length > 0) {
    const userLendingData = await getUserOnchainData(userAddresses);

    await ctx.reply(`
      Your positions:
      ${Object.entries(userLendingData).map(([userAddress, addressPositions]) => (`\n\\- On \`${userAddress}\`: ${Object.entries(addressPositions).length === 0 ?
      'None' :
      Object.values(addressPositions).map(({ textPositionRepresentation }) => textPositionRepresentation)}
      `)).join('')}
    `, TELEGRAM_MESSAGE_OPTIONS);
  } else {
    await ctx.reply('Your watchlist is empty');
  }
});

bot.command('help', async (ctx) => await ctx.reply(HELP_TEXT, TELEGRAM_MESSAGE_OPTIONS));

// Note: Telegraf is middleware-based, so it's important that this text handler is last
// in the list to act as a catch-all.
bot.on(message('text'), async (ctx) => await ctx.reply(HELP_TEXT, TELEGRAM_MESSAGE_OPTIONS));

export const handler = http(bot.webhookCallback('/telegraf'));
