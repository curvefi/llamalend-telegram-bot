# Llamalend Telegram Bot

[`@LlamalendMonitorBot`](https://t.me/LlamalendMonitorBot) is a Telegram bot that allows you to view loan information from [Curve Lend](https://curve.finance/lend/) and [crvUSD](https://curve.finance/crvusd/) for any address you want; it’ll also notify you of important changes to these loans’ health statuses. The bot monitors all Curve Lend and crvUSD markets, on Ethereum, Arbitrum, Fraxtal and Optimism.

Example use-cases:

- Monitor your own loans
- Monitor loans of a DAO or multisig you're interested in
- Monitor loans of a public figure that have market significance

## How to use

Start a conversation with [`@LlamalendMonitorBot`](https://t.me/LlamalendMonitorBot) on Telegram: <https://t.me/LlamalendMonitorBot>

## Available commands

- `/add 0xADDRESS`: Start monitoring an address; the bot will notify you of important changes to health statuses of this address’ loans on Curve Lend and crvUSD
- `/remove 0xADDRESS`: Stop monitoring an address
- `/list`: List all addresses you’ve added (and the last time the bot has checked them automatically)
- `/view`: View loan information for all addresses you’ve added (this command always returns current onchain data)

## When does the bot alert you

A loan on Curve can be in three different states:

- `Healthy`
- `Soft Liquidation`
- `Hard Liquidation`

([Read more about borrowing, soft and hard liquidations, in Curve Resources](https://resources.curve.finance/lending/overview/#borrowing))

The bot checks positions on monitored addresses every 5-10 minutes. When the health status changes (e.g. from `Healthy` to `Soft Liquidation`) or your health ratio enters/exits a dangerous zone (i.e. below 2%), it sends you a message with the loan’s current details.

The bot also runs a check right when a new address is added, and if this address contains any position that is unhealthy in any way, it tells you about it right away.

## Privacy

This software does not collect any data beyond what is necessary to offer the service described above. The main three pieces of data that are collected and stored are:

1. Your Telegram user id: necessary for the bot to send messages to the right user
2. The addresses you add using the `/add` command: necessary for their monitoring
3. Loan positions on these addresses (including the lending market’s address and its state): necessary for detecting when their states change

(See methods responsible for saving this data: [1](https://github.com/curvefi/llamalend-telegram-bot/blob/main/data/addUserAddress.js) and [2](https://github.com/curvefi/llamalend-telegram-bot/blob/main/data/saveUserPositionHealthChange.js))

Please note that:

- This is a Telegram bot: data you send to the bot, and data that the bot sends back to you, all go through Telegram’s servers, and this usage is subject to Telegram’s privacy policy
- This software runs on AWS infrastructure: data you send to the bot, data that the bot sends back, and the minimal data described above that is stored in the database, all involve AWS infrastructure which is subject to AWS’ privacy policy

## License

Please see [this software’s license](https://github.com/curvefi/llamalend-telegram-bot/blob/main/LICENSE) for a statement on licensing, risks, absence of warranty/liability, etc
