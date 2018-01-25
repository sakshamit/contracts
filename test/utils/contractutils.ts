// import * as abi from "ethereumjs-abi";
import * as fs from "fs";
import { promisify } from "util";
// We're just using types from web3
/* tslint:disable no-implicit-dependencies */
import * as Web3 from "web3";
/* tslint:enable no-implicit-dependencies */
import { BigNumber } from "web3-typescript-typings/node_modules/bignumber.js";

const Token = artifacts.require("tokens/eip20/EIP20");
const DLL = artifacts.require("dll/DLL");
const AttributeStore = artifacts.require("attrstore/AttributeStore");
const PLCRVoting = artifacts.require("PLCRVoting");
const Parameterizer = artifacts.require("Parameterizer");
const abi = require("ethereumjs-abi");



export function findEvent<T = any>(tx: any, eventName: string): Web3.DecodedLogEntry<T> {
  return tx.logs.find((log: any) => log.event === eventName);
}

export function idFromEvent(tx: any): BigNumber | undefined {
  for (const log of tx.logs) {
    if (log.args.id) {
      return log.args.id;
    }
  }
  return undefined;
}

export function getReceiptValue(receipt: any, arg: any) {
  return receipt.logs[0].args[arg];
}

export function is0x0Address(address: string): boolean {
  return address === "0x0" || address === "0x0000000000000000000000000000000000000000";
}

export async function timestampFromTx(web3: Web3, tx: Web3.Transaction | Web3.TransactionReceipt): Promise<number> {
  if (tx.blockNumber === null) {
    throw new Error("Transaction not yet mined");
  }
  const getBlock = promisify<number, Web3.BlockWithoutTransactionData>(web3.eth.getBlock.bind(web3.eth));
  return (await getBlock(tx.blockNumber)).timestamp;
}

export async function advanceEvmTime(time: number, account: string) {
  await web3.currentProvider.send({ from: account,
                                    id: new Date().getSeconds(),
                                    jsonrpc: "2.0",
                                    method: "evm_increaseTime",
                                    params: [time],
                                  });
  await web3.currentProvider.send({ from: account,
                                    id: new Date().getSeconds(),
                                    jsonrpc: "2.0",
                                    method: "evm_mine",
                                    params: [],
                                  });
}

export async function proposeReparamAndGetPropID( propName: string,
                                                  propValue: string,
                                                  parameterizer: any,
                                                  account: string,
                                                ) {
  const receipt = await parameterizer.proposeReparameterization(propName,
                                                                propValue,
                                                                { from: account });
  return receipt.logs[0].args.propID;
}

export function getVoteSaltHash(vote: string, salt: string): string {
  return `0x${abi.soliditySHA3(["uint", "uint"], [vote, salt]).toString("hex")}`;
}
export function isEVMException(err: any): boolean {
  return err.toString().includes("revert");
}

export async function commitVote( voting: any,
                                  pollID: any,
                                  voteOption: string,
                                  tokensArg: string,
                                  salt: string,
                                  voter: string) {

  const hash = getVoteSaltHash(voteOption, salt);
  await voting.requestVotingRights(tokensArg, { from: voter });

  const prevPollID = await voting.getInsertPointForNumTokens.call(voter, tokensArg);
  await voting.commitVote(pollID, hash, tokensArg, prevPollID, { from: voter });
}

export function divideAndGetWei(numerator: number, denominator: number) {
  const weiNumerator = web3.toWei(new BigNumber(numerator), "gwei");
  return weiNumerator.div(new BigNumber(denominator));
}

export function multiplyFromWei(x: number, weiBN: BigNumber) {
  const weiProduct = new BigNumber(x).mul(weiBN);
  return new BigNumber(web3.fromWei(weiProduct, "gwei"));
}

export function multiplyByPercentage(x: number, y: number, z = 100) {
  const weiQuotient = divideAndGetWei(y, z);
  return multiplyFromWei(x, weiQuotient);
}

export async function giveTokensTo( totalSupply: BigNumber,
                                    addresses: string[],
                                    accounts: string[],
                                    token: any,
                                  ): Promise<boolean> {
  const user = addresses[0];
  const allocation = totalSupply.div(new BigNumber(accounts.length, 10));
  await token.transfer(user, allocation);

  if (addresses.length === 1) { return true; }
  return await giveTokensTo(totalSupply, addresses.slice(1), accounts, token);
}

export async function createAndDistributeToken(totalSupply: BigNumber, decimals: string, addresses: string[]): Promise<any> {
  const token = await Token.new(totalSupply, "TestCoin", decimals, "TEST");
  await giveTokensTo(totalSupply, addresses, addresses, token);
  return token;
}

export async function createTestParameterizerInstance(accounts: string[]): Promise<any> {

  async function approvePLCRFor(addresses: string[]): Promise<boolean> {
    // const token = await Token.deployed();
    const user = addresses[0];
    const balanceOfUser = await token.balanceOf(user);

    console.log("user: " + user);
    console.log("balanceOfUser: " + balanceOfUser);
    console.log("token: " + token);
    console.log("token.address: " + token.address);
    console.log("plcr.address: " + plcr.address);

    await token.approve(plcr.address, balanceOfUser, { from: user });
    if (addresses.length === 1) { return true; }
    return approvePLCRFor(addresses.slice(1));
  }

  async function approveParameterizerFor(addresses: string[]): Promise<boolean> {
    // const token = await Token.deployed();
    const user = addresses[0];
    const balanceOfUser = await token.balanceOf(user);
    await token.approve(parameterizer.address, balanceOfUser, { from: user });
    if (addresses.length === 1) { return true; }
    return approveParameterizerFor(addresses.slice(1));
  }

  const token = await createAndDistributeToken(new BigNumber("1000000000000000000000000"), "18", accounts);
  console.log("1");
  const dll = await DLL.new();
  const attrstore = await AttributeStore.new();

  console.log("2");
  PLCRVoting.link("dll", dll);
  PLCRVoting.link("attrstore", attrstore);
  console.log("2a. dll: " + dll);
  console.log("2a. dll.address: " + dll.address);
  const plcr = await PLCRVoting.new(token.address);
  console.log("3 - plcr: " + plcr);

  await approvePLCRFor(accounts);

  const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
  const parameterizerConfig = config.paramDefaults;

  console.log("4");
  Parameterizer.link(dll);
  Parameterizer.link(attrstore);

  console.log("5");
  const parameterizer = await Parameterizer.new(
    token.address,
    plcr.address,
    parameterizerConfig.minDeposit,
    parameterizerConfig.pMinDeposit,
    parameterizerConfig.applyStageLength,
    parameterizerConfig.pApplyStageLength,
    parameterizerConfig.commitStageLength,
    parameterizerConfig.pCommitStageLength,
    parameterizerConfig.revealStageLength,
    parameterizerConfig.pRevealStageLength,
    parameterizerConfig.dispensationPct,
    parameterizerConfig.pDispensationPct,
    parameterizerConfig.voteQuorum,
    parameterizerConfig.pVoteQuorum,
  );

  console.log("6");

  return parameterizer;
}
