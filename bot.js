import http from 'serverless-http';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { isAddress } from 'ethers';
import { lc } from './utils/String.js';
import getUserAddresses from './data/getUserAddresses.js';
import saveUserAddresses from './data/saveUserAddresses.js';
import { MAX_ADDRESSES_PER_USER } from './constants/BotConstants.js';

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

const HELP_TEXT = `@CurveLendMonitorBot allows you to view loan information from [Curve Lend](https://lend.curve.fi/) and [crvUSD](https://crvusd.curve.fi/) for any address you want; it’ll also notify you of important changes to these loans health ratios\\.

Here are the available commands:

\\- \`/add 0xADDRESS\`: Start monitoring an address; the bot will notify you of important changes to health ratios of this address’ loans on Curve Lend and crvUSD
\\- \`/remove 0xADDRESS\`: Stop monitoring an address
\\- /view: List all addresses you’ve added
\\- /check: View loan information for all addresses you’ve added
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

bot.command('view', async (ctx) => {
  const telegramUserId = ctx.update.message.from.id;
  const userAddresses = await getUserAddresses(telegramUserId);

  if (userAddresses.length > 0) {
    ctx.reply(`All addresses in your watchlist:\n\n${userAddresses.map(({ address }) => `\\- \`${address}\``).join("\n")}`, TELEGRAM_MESSAGE_OPTIONS);
  } else {
    ctx.reply('Your watchlist is empty');
  }
});

bot.command('help', async (ctx) => ctx.reply(HELP_TEXT, TELEGRAM_MESSAGE_OPTIONS));

// Note: Telegraf is middleware-based, so it's important that this text handler is last
// in the list to act as a catch-all.
bot.on(message('text'), async (ctx) => ctx.reply(HELP_TEXT, TELEGRAM_MESSAGE_OPTIONS));

export const hookbot = http(bot.webhookCallback('/telegraf'));
