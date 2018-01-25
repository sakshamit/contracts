
import BN from "bignumber.js";
import * as chai from "chai";
import * as fs from "fs";
import ChaiConfig from "../utils/chaiconfig";
import {  advanceEvmTime,
          commitVote,
          // createTestParameterizerInstance,
          multiplyByPercentage,
        } from "../utils/contractutils";

const Parameterizer = artifacts.require("Parameterizer");
const PLCRVoting = artifacts.require("PLCRVoting");
const Token = artifacts.require("EIP20.sol");

ChaiConfig();
const expect = chai.expect;
const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
const paramConfig = config.paramDefaults;

contract("Parameterizer", (accounts) => {
  describe("challengeReparameterization", () => {
    const [proposer, challenger, voter] = accounts;
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

    it("should leave parameters unchanged if a proposal loses a challenge", async () => {
      const proposerStartingBalance = await token.balanceOf(proposer);
      const challengerStartingBalance = await token.balanceOf(challenger);

      const receipt = await parameterizer.proposeReparameterization("voteQuorum", "51", { from: proposer });

      const { propID } = receipt.logs[0].args;

      await parameterizer.challengeReparameterization(propID, { from: challenger });

      await advanceEvmTime(paramConfig.pCommitStageLength + paramConfig.pRevealStageLength + 1, accounts[0]);

      await parameterizer.processProposal(propID);

      const voteQuorum = await parameterizer.get("voteQuorum");
      expect(voteQuorum.toString(10)).to.be.equal("50");

      const proposerFinalBalance = await token.balanceOf(proposer);
      const proposerExpected = proposerStartingBalance.sub(new BN(paramConfig.pMinDeposit, 10));
      expect(proposerFinalBalance.toString(10)).to.be.equal(proposerExpected.toString(10));

      // Edge case, challenger gets both deposits back because there were no voters
      const challengerFinalBalance = await token.balanceOf(challenger);
      const challengerExpected = challengerStartingBalance.add(new BN(paramConfig.pMinDeposit, 10));
      expect(challengerFinalBalance.toString(10)).to.be.equal(challengerExpected.toString(10));
    });

    it("should set new parameters if a proposal wins a challenge", async () => {
      const proposerStartingBalance = await token.balanceOf(proposer);
      const challengerStartingBalance = await token.balanceOf(challenger);

      const proposalReceipt = await parameterizer.proposeReparameterization("voteQuorum", "51", { from: proposer });
      const { propID } = proposalReceipt.logs[0].args;

      const challengeReceipt =
        await parameterizer.challengeReparameterization(propID, { from: challenger });
      const challengeID = challengeReceipt.logs[0].args.pollID;

      await commitVote(voting, challengeID, "1", "10", "420", voter);
      await advanceEvmTime(paramConfig.pCommitStageLength + 1, accounts[0]);

      await voting.revealVote(challengeID, "1", "420", { from: voter });
      await advanceEvmTime(paramConfig.pRevealStageLength + 1, accounts[0]);

      await parameterizer.processProposal(propID);

      const voteQuorum = await parameterizer.get("voteQuorum");
      expect(voteQuorum.toString(10)).to.be.equal("51");

      const proposerFinalBalance = await token.balanceOf(proposer);
      const winnings = multiplyByPercentage(paramConfig.pMinDeposit, paramConfig.pDispensationPct);
      const proposerExpected = proposerStartingBalance.add(winnings);
      expect(proposerFinalBalance.toString(10)).to.be.equal(proposerExpected.toString(10));

      const challengerFinalBalance = await token.balanceOf(challenger);
      const challengerExpected = challengerStartingBalance.sub(new BN(paramConfig.pMinDeposit, 10));
      expect(challengerFinalBalance.toString(10)).to.be.equal(challengerExpected.toString(10));
    });
  });
});
