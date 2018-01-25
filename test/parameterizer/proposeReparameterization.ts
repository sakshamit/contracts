import BN from "bignumber.js";
import * as chai from "chai";
import * as fs from "fs";
import ChaiConfig from "../utils/chaiconfig";
import {  advanceEvmTime,
          commitVote,
          // createTestParameterizerInstance,
          getReceiptValue,
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

const bigTen = (numberparam: number) => new BN(numberparam.toString(10), 10);

contract("Parameterizer", (accounts) => {
  describe("proposeReparameterization", () => {
    const [proposer, secondProposer] = accounts;
    const pMinDeposit = bigTen(paramConfig.pMinDeposit);
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

    it("should add a new reparameterization proposal", async () => {
      const applicantStartingBalance = await token.balanceOf.call(proposer);

      const receipt = await parameterizer.proposeReparameterization("voteQuorum", "51", { from: proposer });

      const propID = getReceiptValue(receipt, "propID");
      const paramProposal = await parameterizer.proposals(propID);

      expect(paramProposal[6].toString(10)).to.be.equal(
        "51",
        "The reparameterization proposal was not created, or not created correctly.",
      );

      const applicantFinalBalance = await token.balanceOf.call(proposer);
      const expected = applicantStartingBalance.sub(pMinDeposit);
      expect(applicantFinalBalance.toString(10)).to.be.equal(
        expected.toString(10),
        "tokens were not properly transferred from proposer",
      );
    });

    it("should not allow a NOOP reparameterization", async () => {
      try {
        await parameterizer.proposeReparameterization("voteQuorum", "51", { from: proposer });
        expect(false).to.be.true("Performed NOOP reparameterization");
      } catch (err) {
        expect(isEVMException(err)).to.be.true(err.toString());
      }
    });

    it("should not allow a reparameterization for a proposal that already exists", async () => {
      const applicantStartingBalance = await token.balanceOf.call(secondProposer);

      try {
        await parameterizer.proposeReparameterization("voteQuorum", "51", { from: secondProposer });
        expect(false).to.be.true("should not have been able to make duplicate proposal");
      } catch (err) {
        expect(isEVMException(err)).to.be.true(err.toString());
      }

      const applicantEndingBalance = await token.balanceOf.call(secondProposer);

      expect(applicantEndingBalance.toString(10)).to.be.equal(
        applicantStartingBalance.toString(10),
        "starting balance and ending balance should have been equal");
    });
  });
});
