import * as chai from "chai";
import ChaiConfig from "../utils/chaiconfig";
import * as utils from "../utils/contractutils";

const Parameterizer = artifacts.require("Parameterizer");
const PLCRVoting = artifacts.require("PLCRVoting");

ChaiConfig();
const expect = chai.expect;

contract("Parameterizer", (accounts) => {
  describe("Function: voterReward", () => {
    const [proposer, challenger, voterAlice] = accounts;
    let parameterizer: any;
    let voting: any;

    before(async () => {
      // await createTestParameterizerInstance(accounts);
      parameterizer = await Parameterizer.deployed();
      voting = await PLCRVoting.deployed();
    });

    it("should return the correct number of tokens to voter on the winning side.", async () => {
      const propID = await utils.proposeReparamAndGetPropID("voteQuorum", "51", parameterizer, proposer);
      const receipt = await parameterizer.challengeReparameterization(propID, { from: challenger });
      const challengeID = receipt.logs[0].args.pollID;
      // Alice commits a vote: FOR, 10 tokens, 420 salt
      await utils.commitVote(voting, challengeID, "1", "10", "420", voterAlice);
      await utils.advanceEvmTime(utils.paramConfig.pCommitStageLength + 1);

      // Alice reveals her vote: FOR, 420 salt
      await voting.revealVote(challengeID, "1", "420", { from: voterAlice });
      await utils.advanceEvmTime(utils.paramConfig.pRevealStageLength + 1);

      await parameterizer.processProposal(propID);

      // Grab the challenge struct after the proposal has been processed
      const challenge = await parameterizer.challenges(challengeID);
      const voterTokens = await voting.getNumPassingTokens(voterAlice, challengeID, "420"); // 10
      const rewardPool = challenge[0]; // 250,000
      const totalTokens = challenge[4]; // 10

      const expectedVoterReward = (voterTokens.mul(rewardPool)).div(totalTokens); // 250,000
      const voterReward = await parameterizer.voterReward(voterAlice, challengeID, "420");

      expect(expectedVoterReward).to.be.bignumber.equal(
        voterReward,
        "voterReward should have equaled tokens * pool / total",
      );
    });
    // TODO: Complete
    // it("should return zero tokens to a voter who cannot reveal a vote on the winning side.");
  });
});
