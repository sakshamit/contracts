import BN from "bignumber.js";
import * as chai from "chai";
import ChaiConfig from "../utils/chaiconfig";
import {
          commitVote,
          // createTestParameterizerInstance,
          paramConfig,
        } from "../utils/contractutils";

const AddressRegistry = artifacts.require("AddressRegistry");
const PLCRVoting = artifacts.require("PLCRVoting");

ChaiConfig();
const expect = chai.expect;

contract("PLCRVoting", (accounts) => {
  describe("Function: commitVote", () => {
    const [applicant, challenger, voter, applicant2] = accounts;
    const listingAddress1 = "0x1a5cdcFBA600e0c669795e0B65c344D5A37a4d5A";
    const listingAddress2 = "0x2a5cdcFBA600e0c669795e0B65c344D5A37a4d5A";
    let registry: any;
    let voting: any;

    before(async () => {
      // await createTestParameterizerInstance(accounts);
      registry = await AddressRegistry.deployed();
      voting = await PLCRVoting.deployed();
    });

    it("should correctly update DLL state", async () => {
      const minDeposit = new BN(paramConfig.minDeposit, 10);

      await registry.apply(listingAddress1, minDeposit, "", { from: applicant });
      await registry.apply(listingAddress2, minDeposit, "", { from: applicant2 });

      const firstChallengeReceipt = await registry.challenge(listingAddress1, "", { from: challenger });
      const firstPollID = firstChallengeReceipt.logs[0].args.pollID;
      const secondChallengeReceipt = await registry.challenge(listingAddress2, "", { from: challenger });
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
