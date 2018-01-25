import * as BN from "bignumber.js";
import * as chai from "chai";
import * as fs from "fs";
import ChaiConfig from "../utils/chaiconfig";
import {  advanceEvmTime,
          // createTestParameterizerInstance,
          proposeReparamAndGetPropID,
        } from "../utils/contractutils";

const Parameterizer = artifacts.require("Parameterizer");

ChaiConfig();
const expect = chai.expect;
const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
const paramConfig = config.paramDefaults;

contract("Parameterizer", (accounts: string[]) => {
  describe("canBeSet", () => {
    const proposer = accounts[0];
    let parameterizer: any;

    before(async () => {
      // await createTestParameterizerInstance(accounts);
      parameterizer = await Parameterizer.deployed();
    });

    it("should return true if a proposal passed its application stage with no challenge", async () => {
      const propID = await proposeReparamAndGetPropID("voteQuorum", "51", parameterizer, accounts[0]);
      await advanceEvmTime(paramConfig.pApplyStageLength + 1, accounts[0]);
      const result = await parameterizer.canBeSet(propID);
      expect(result).to.be.true();
    });
    it("should return false if a proposal is still in its application stage with no challenge", async () => {
      const propID = await proposeReparamAndGetPropID("pRevealStageLength", "500", parameterizer, accounts[0]);
      const result = await parameterizer.canBeSet(propID);
      expect(result).to.be.false();
    });
    it("should expect false immediately after proposal, and true once enough time has passed", async () => {
      const propID = await proposeReparamAndGetPropID("dispensationPct", "58", parameterizer, accounts[0]);

      const betterBeFalse = await parameterizer.canBeSet(propID);
      expect(betterBeFalse).to.be.false();

      await advanceEvmTime(paramConfig.pApplyStageLength + 1, accounts[0]);

      const result = await parameterizer.canBeSet(propID);
      expect(result).to.be.true();
    });
  });
});
