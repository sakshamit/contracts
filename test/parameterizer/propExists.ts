import BN from "bignumber.js";
import * as chai from "chai";
import * as fs from "fs";
import ChaiConfig from "../utils/chaiconfig";
import {  advanceEvmTime,
          commitVote,
          // createTestParameterizerInstance,
          isEVMException,
          multiplyByPercentage,
          proposeReparamAndGetPropID,
        } from "../utils/contractutils";

const Parameterizer = artifacts.require("Parameterizer");
const PLCRVoting = artifacts.require("PLCRVoting");
const Token = artifacts.require("EIP20.sol");

ChaiConfig();
const expect = chai.expect;
const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
const paramConfig = config.paramDefaults;

contract("Parameterizer", (accounts) => {
  describe("propExists", () => {
    const [proposer] = accounts;
    let parameterizer: any;
    let voting: any;
    let token: any;

    before(async () => {
      // await createTestParameterizerInstance(accounts);
      parameterizer = await Parameterizer.deployed();
      voting = await PLCRVoting.deployed();
      const tokenAddress = await parameterizer.token();
      token = await Token.at(tokenAddress);
    });

    it("should true if a proposal exists for the provided propID", async () => {
      const propID = await proposeReparamAndGetPropID("voteQuorum", "51", parameterizer, proposer);
      const result = await parameterizer.propExists(propID);
      expect(result).to.be.true("should have been true cause I literally just made the proposal");
    });

    it("should false if no proposal exists for the provided propID", async () => {
      const result = await parameterizer.propExists("666");
      expect(result).to.be.false("should have been false cause i just made it up!");
    });
  });
});
