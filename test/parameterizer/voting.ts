import BN from "bignumber.js";
import * as chai from "chai";
import * as fs from "fs";
import ChaiConfig from "../utils/chaiconfig";
import {  advanceEvmTime,
          commitVote,
          // createTestParameterizerInstance,
          multiplyByPercentage,
          proposeReparamAndGetPropID,
        } from "../utils/contractutils";

const AddressRegistry = artifacts.require("AddressRegistry");
const Parameterizer = artifacts.require("Parameterizer");
const PLCRVoting = artifacts.require("PLCRVoting");
const Token = artifacts.require("EIP20.sol");

ChaiConfig();
const expect = chai.expect;
const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
const paramConfig = config.paramDefaults;

contract("PLCRVoting", (accounts) => {
  describe("Function: commitVote", () => {
    const [applicant, challenger, voter, applicant2] = accounts;
    let registry: any;
    let parameterizer: any;
    let voting: any;
    let token: any;

    before(async () => {
      // await createTestParameterizerInstance(accounts);
      registry = await AddressRegistry.deployed();
      parameterizer = await Parameterizer.deployed();
      voting = await PLCRVoting.deployed();
      const tokenAddress = await parameterizer.token();
      token = await Token.at(tokenAddress);
    });

    it("should correctly update DLL state", async () => {
      const minDeposit = new BN(paramConfig.minDeposit, 10);
      const balance = await token.balanceOf(applicant);

      await registry.apply(minDeposit, "", { from: applicant });
      await registry.apply(minDeposit, "", { from: applicant2 });

      const firstChallengeReceipt = await registry.challenge(applicant, "", { from: challenger });
      const firstPollID = firstChallengeReceipt.logs[0].args.pollID;
      const secondChallengeReceipt = await registry.challenge(applicant2, "", { from: challenger });
      const secondPollID = secondChallengeReceipt.logs[0].args.pollID;

      await commitVote(voting, firstPollID, "1", "7", "420", voter);
      await commitVote(voting, secondPollID, "1", "8", "420", voter);
      await commitVote(voting, firstPollID, "1", "9", "420", voter);
      
      const insertPoint = await voting.getInsertPointForNumTokens(voter, 6);
      const expectedInsertPoint = 0;

      expect(insertPoint.toString(10)).to.be.equal(
        expectedInsertPoint.toString(10),
        "The insert point was not correct",
      );
    });
  });
});
