import { setup, print_balance, anchor_deposit, anchor_withdraw_deposit } from "./index";
import { program } from "commander";

const package_json = require('../package.json');
let [addressProvider, lcd, address, wallet, anchor] = setup();
let p = program.version(package_json.version);
p
    .command('balance')
    .description('print balance of account')
    .action(() => { print_balance(lcd, address, addressProvider) });
p
    .command('deposit <amount>')
    .description('deposit aUSTs')
    .action((amount) => { anchor_deposit(anchor, wallet, lcd, address, amount) });
p
    .command('withdraw_deposit <amount>')
    .description('withdraw deposited UST')
    .action((amount) => { anchor_withdraw_deposit(anchor, wallet, lcd, address, amount) })

p.parse();