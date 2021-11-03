import { BlockTxBroadcastResult, Int, int, LCDClient, MintAPI, MnemonicKey, StdFee, StdSignMsg, StdTx, Wallet } from "@terra-money/terra.js";
import { Coin, Denom } from "@terra-money/terra.js";
import { MsgDelegate } from "@terra-money/terra.js";
import { Anchor, bombay12, AddressProviderFromJson, MARKET_DENOMS, OperationGasParameters, COLLATERAL_DENOMS, AddressProvider } from "@anchor-protocol/anchor.js";
import { Numeric } from "@terra-money/terra.js";

const VALIDATOR_ADDR = "terravaloper1vk20anceu6h9s00d27pjlvslz3avetkvnwmr35";
const CHAIN_ID = 'bombay-12';

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function setup(): [AddressProvider, LCDClient, string, Wallet, Anchor] {
	// These are the addresses of contracts of various anchor-related services.
	// Use columbus-5 instead of bombay for mainnet services.
	// This doc is for testnet services.
	console.log('If you need some testnet coins use: https://faucet.terra.money/');

	const addressProvider = new AddressProviderFromJson(bombay12);
	console.log(`Running on testnet, chainID: ${CHAIN_ID}`);

	const LCDUrl = 'https://bombay-lcd.terra.dev';
	console.log(`Connecting to LCD server: ${LCDUrl}`);

	const lcd: LCDClient = new LCDClient({ URL: 'https://bombay-lcd.terra.dev', chainID: CHAIN_ID });

	// This is a testnet mnemonic, obviously.
	const key = new MnemonicKey({
		mnemonic: 'party renew sweet debris hurry avocado voyage feature valve pumpkin monitor desert sick faith tuition inform excuse impose course arrive grant evil satoshi relief'

	});
	const address = 'terra15aslj5rud7emhhnxp860d57h9re5328mvxyf39';
	console.log(`Using address: ${address}`);
	console.log(`More info about address: https://finder.terra.money/${CHAIN_ID}/address/${address}`);


	const wallet = new Wallet(lcd, key);
	const anchor = new Anchor(lcd, addressProvider);

	return [addressProvider, lcd, address, wallet, anchor];

}

async function example_main() {
	let [addressProvider, lcd, address, wallet, anchor] = setup();
	//////////////////////////// Playground begins //////////////////////////////////////////////
	// Anchor stuff: (uncomment and enjoy):
	// Depositing:
	const block_time = 10000;
	await anchor_deposit(anchor, wallet, lcd, address, "10.00");
	await sleep(block_time);
	await anchor_withdraw_deposit(anchor, wallet, lcd, address, "9.00");
	await sleep(block_time);

	// Borrowing:
	await anchor_bluna_mint(anchor, wallet, lcd, address, VALIDATOR_ADDR, "10");
	await sleep(block_time);
	await anchor_collateralize(anchor, wallet, lcd, address, "5");
	await sleep(block_time);
	await anchor_borrow(anchor, wallet, lcd, address, "10");
	await sleep(block_time);
	await anchor_repay_all_loan(anchor, wallet, lcd, address);
	await sleep(block_time);
	await anchor_uncollateralize(anchor, wallet, lcd, address, "4");
	await sleep(block_time);
	await anchor_bluna_burn(anchor, wallet, lcd, address, "3");
	await sleep(block_time);
	await anchor_bluna_instant_burn(anchor, wallet, lcd, address, "5");

}

async function get_coin_amount(contract_address: string, lcd: LCDClient, address: string): Promise<number> {
	interface BalanceResponse {
		balance: number
	};
	const { balance } = await lcd.wasm.contractQuery<BalanceResponse>(contract_address, { balance: { address } });
	return balance;
}
export async function print_balance(lcd: LCDClient, address: string, address_provider: AddressProvider) {
	const balance = await lcd.bank.balance(address);
	console.log(`Current balance:`)
	for (let denom of balance.denoms()) {
		const cur_balance = balance.get(denom)
		console.log(`${denom.toString()} : ${cur_balance?.amount.toString()}`);
	}

	// Get aUST amount:
	const aust_amount = await get_coin_amount(address_provider.aTerra(MARKET_DENOMS.UUSD), lcd, address);
	console.log(`uaUST: ${aust_amount}`);
	const bluna_amount = await get_coin_amount(address_provider.bLunaToken(), lcd, address);
	console.log(`ubLuna: ${bluna_amount}`);
}

async function print_tx_result(result: BlockTxBroadcastResult) {
	console.log("Transaction broadcast!");
	console.log(`Tx Hash: ${result.txhash}`);
	console.log(`Height: ${result.height}`);
	console.log(`Gas Used: ${result.gas_used}`);
	console.log(`More info: https://finder.terra.money/${CHAIN_ID}/tx/${result.txhash}`);

}

async function broadcast_tx(tx_signed: StdTx, lcd: LCDClient) {
	const broadcast_result = await lcd.tx.broadcast(tx_signed);
}

export async function anchor_deposit(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, deposit_amount: string) {
	const deposit_denoms = MARKET_DENOMS.UUSD;
	console.log(`Depositing ${deposit_amount} ${deposit_denoms}`);

	const msgs = anchor.earn.depositStable({ market: deposit_denoms, amount: deposit_amount }).generateWithAddress(personal_address);

	// Sign the tx_to_sign and create a StdTx object from it.
	// In this example we aren't at ZenGo production so I'll just sign with my local wallet.
	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
	console.log(`We should now have some 'aUST' tokens, representing ownership of anchor-deposited UST`);
}

async function deduct_tax(lcd: LCDClient, coin: Coin) {
	// Could be buggy here, I'm not using it yet.
	// https://docs.anchorprotocol.com/ethanchor/fees#terra-blockchain-tax
	const tax_rate = await lcd.treasury.taxRate();
	const tax_cap = await lcd.treasury.taxCap(coin.denom)
	if (tax_cap.amount > tax_rate.mul(coin.amount)) {
		return new Coin(coin.denom, coin.amount.sub(tax_rate.mul(coin.amount)));
	}
	return new Coin(coin.denom, tax_cap.amount);
}

export async function anchor_withdraw_deposit(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, withdraw_amount: string) {
	console.log(`Withdraw ${withdraw_amount}UST`);
	const msgs = anchor.earn.withdrawStable({
		amount: withdraw_amount,
		market: MARKET_DENOMS.UUSD
	}).generateWithAddress(personal_address);

	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
}

export async function anchor_get_deposited_amount(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string): Promise<number> {
	const total_deposit = await anchor.earn.getTotalDeposit({
		market: MARKET_DENOMS.UUSD,
		address: personal_address,
	});
	console.log(`Total Deposit: ${total_deposit} UUSD`);
	return Number.parseInt(total_deposit);
}

async function anchor_borrow(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, amount: string) {
	console.log('Borrowing using anchor - begin')
	const msgs = anchor.borrow.borrow({
		market: MARKET_DENOMS.UUSD,
		amount,
	}).generateWithAddress(personal_address);

	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
	console.log('Borrowing using anchor - end')
}

async function anchor_collateralize(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, amount: string) {
	console.log('Providing some collateral...');
	const msgs = anchor.borrow.provideCollateral(
		{
			market: MARKET_DENOMS.UUSD,
			amount,
			collateral: COLLATERAL_DENOMS.UBLUNA
		}
	).generateWithAddress(personal_address);

	const tx_signed = await wallet.createAndSignTx({
		msgs
	});
	broadcast_tx(tx_signed, lcd);
	console.log('Success providing collateral');
}

async function anchor_bluna_mint(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, validator_address: string, amount: string) {
	console.log('Minting some bLuna');
	const msgs = anchor.bluna.mint({
		amount,
		validator: validator_address
	}).generateWithAddress(personal_address);

	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
	console.log('Minted some bLuna - done');
}

async function anchor_bluna_burn(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, amount: string) {
	console.log('Burning some bLuna');
	const msgs = anchor.bluna.burn(
		{
			amount
		}
	).generateWithAddress(personal_address);

	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
	console.log('It can take up to 24 days until Luna is available under the given address.');
	console.log('For instant burninig - use instnat_burn');
	console.log('Burning some bLuna - done');
}

async function anchor_bluna_instant_burn(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, amount: string) {
	console.log('Instantly burning some bLuna');
	const msgs = anchor.bluna.instantBurn(
		{
			amount
		}
	).generateWithAddress(personal_address);

	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
	console.log('The instant burn yields less Luna but is immediate.');
	console.log('Instantly burning some bLuna - done');
}

async function anchor_repay_all_loan(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string) {
	console.log('Repaying Loan');
	const value = await anchor.borrow.getBorrowedValue({
		market: MARKET_DENOMS.UUSD,
		address: personal_address
	});
	const msgs = anchor.borrow.repay({
		market: MARKET_DENOMS.UUSD,
		amount: value
	}).generateWithAddress(personal_address);

	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
	console.log('Loan Repay - Done');
}

async function anchor_uncollateralize(anchor: Anchor, wallet: Wallet, lcd: LCDClient, personal_address: string, amount: string) {
	console.log('Uncollateralizing');

	// currently there's a bug in anchor here:
	// const bluna_amount = await anchor.borrow.getCollaterals(
	// 	{
	// 		market: MARKET_DENOMS.UUSD,
	// 		address: personal_address,
	// 	}
	// ).catch((e) => console.log(e));
	// console.log(`Uncollateralizing amount: ${ bluna_amount }`);

	const msgs = anchor.borrow.withdrawCollateral({
		market: MARKET_DENOMS.UUSD,
		collateral: COLLATERAL_DENOMS.UBLUNA,
		amount,
	}).generateWithAddress(personal_address);


	const tx_signed = await wallet.createAndSignTx({
		msgs,
	});

	broadcast_tx(tx_signed, lcd);
	console.log('Uncollateralizing - finished');
}
