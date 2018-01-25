import BN from "bignumber.js";
import * as chai from "chai";
import * as fs from "fs";
import ChaiConfig from "../utils/chaiconfig";
import {
          commitVote,
          // createTestParameterizerInstance,
        } from "../utils/contractutils";

const AddressRegistry = artifacts.require("AddressRegistry");
const PLCRVoting = artifacts.require("PLCRVoting");

ChaiConfig();
const expect = chai.expect;
const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
const paramConfig = config.paramDefaults;

contract("PLCRVoting", (accounts) => {
  describe("Function: commitVote", () => {
    const [applicant, challenger, voter, applicant2] = accounts;
    let registry: any;
    let voting: any;

    before(async () => {
      // await createTestParameterizerInstance(accounts);
      registry = await AddressRegistry.deployed();
      voting = await PLCRVoting.deployed();
    });

    it("should correctly update DLL state", async () => {
      const minDeposit = new BN(paramConfig.minDeposit, 10);

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
