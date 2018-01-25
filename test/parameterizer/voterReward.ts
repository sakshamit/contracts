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

const Parameterizer = artifacts.require("Parameterizer");
const PLCRVoting = artifacts.require("PLCRVoting");
const Token = artifacts.require("EIP20.sol");

ChaiConfig();
const expect = chai.expect;
const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
const paramConfig = config.paramDefaults;

contract("Parameterizer", (accounts) => {
  describe("voterReward", () => {
    const [proposer, challenger, voterAlice] = accounts;
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

    it("should return the correct number of tokens to voter on the winning side.", async () => {
      const propID = await proposeReparamAndGetPropID("voteQuorum", "51", parameterizer, proposer);
      const receipt = await parameterizer.challengeReparameterization(propID, { from: challenger });
      const challengeID = receipt.logs[0].args.pollID;
      // Alice commits a vote: FOR, 10 tokens, 420 salt
      await commitVote(voting, challengeID, "1", "10", "420", voterAlice);
      await advanceEvmTime(paramConfig.pCommitStageLength + 1, accounts[0]);

      // Alice reveals her vote: FOR, 420 salt
      await voting.revealVote(challengeID, "1", "420", { from: voterAlice });
      await advanceEvmTime(paramConfig.pRevealStageLength + 1, accounts[0]);

      await parameterizer.processProposal(propID);

      // Grab the challenge struct after the proposal has been processed
      const challenge = await parameterizer.challenges(challengeID);
      const voterTokens = await voting.getNumPassingTokens(voterAlice, challengeID, "420"); // 10
      const rewardPool = challenge[0]; // 250,000
      const totalTokens = challenge[4]; // 10

      const expectedVoterReward = (voterTokens.mul(rewardPool)).div(totalTokens); // 250,000
      const voterReward = await parameterizer.voterReward(voterAlice, challengeID, "420");

      expect(expectedVoterReward.toString(10)).to.be.equal(
        voterReward.toString(10),
        "voterReward should have equaled tokens * pool / total",
      );
    });
    // TODO: Complete
    // it("should return zero tokens to a voter who cannot reveal a vote on the winning side.");
  });
});
