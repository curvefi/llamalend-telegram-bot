import { Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

const TELEGRAM_MESSAGE_OPTIONS = {
  link_preview_options: { is_disabled: true },
  parse_mode: 'MarkdownV2',
};

const HELP_TEXT = `@CurveLendMonitorBot allows you to view loan information from [Curve Lend](https://lend.curve.fi/) and [crvUSD](https://crvusd.curve.fi/) for any address you want; it’ll also notify you of important changes to these loans’ health statuses\\.

Here are the available commands:

\\- \`/add 0xADDRESS\`: Start monitoring an address; the bot will notify you of important changes to health statuses of this address’ loans on Curve Lend and crvUSD
\\- \`/remove 0xADDRESS\`: Stop monitoring an address
\\- /list: List all addresses you’ve added
\\- /view: View loan information for all addresses you’ve added
\\- /help: List all available commands
`;

export {
  bot,
  TELEGRAM_MESSAGE_OPTIONS,
  HELP_TEXT,
};