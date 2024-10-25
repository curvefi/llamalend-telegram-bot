import { Telegraf } from 'telegraf';

const token = (
  process.env.SLS_STAGE === 'production' ?
    process.env.BOT_TOKEN_PROD :
    process.env.BOT_TOKEN_DEV
);
const bot = new Telegraf(token);

const TELEGRAM_MESSAGE_OPTIONS = {
  link_preview_options: { is_disabled: true },
  parse_mode: 'MarkdownV2',
};

const HELP_TEXT = `@LlamalendMonitorBot allows you to view loan information from [Curve Lend](https://lend.curve.fi/) and [crvUSD](https://crvusd.curve.fi/) for any address you want; it’ll also notify you of important changes to these loans’ health statuses\\.

Available commands:

\\- \`/add 0xADDRESS\`: Start monitoring an address; the bot will notify you of important changes to health statuses of this address’ loans on Curve Lend and crvUSD
\\- \`/remove 0xADDRESS\`: Stop monitoring an address
\\- /list: List all addresses you’ve added
\\- /view: View loan information for all addresses you’ve added
\\- /help: List all available commands

[More information on GitHub](https://github.com/curvefi/llamalend-telegram-bot?tab=readme-ov-file#curve-lend-telegram-bot)`;

export {
  bot,
  TELEGRAM_MESSAGE_OPTIONS,
  HELP_TEXT,
};
