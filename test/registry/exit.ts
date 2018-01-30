import BN from "bignumber.js";
import * as chai from "chai";
import ChaiConfig from "../utils/chaiconfig";
import * as utils from "../utils/contractutils";

const AddressRegistry = artifacts.require("AddressRegistry");
const Parameterizer = artifacts.require("Parameterizer");
const Token = artifacts.require("EIP20");
const PLCRVoting = artifacts.require("PLCRVoting");

ChaiConfig();
const expect = chai.expect;

contract("Registry", (accounts) => {
  describe("Function: exit", () => {
    const [applicant, challenger, voter] = accounts;
    const listing17 = "0x0000000000000000000000000000000000000017";
    const listing18 = "0x0000000000000000000000000000000000000018";
    let registry: any;
    let parameterizer: any;
    let token: any;
    let voting: any;

    before(async () => {
      registry = await AddressRegistry.deployed();
      parameterizer = await Parameterizer.deployed();
      token = await Token.deployed();
      voting = await PLCRVoting.deployed();
    })

    it("should allow a listing to exit when no challenge exists", async () => {
      const initialApplicantTokenHoldings = await token.balanceOf(applicant);

      await utils.addToWhitelist(listing17, utils.paramConfig.minDeposit, applicant, registry);

      const isWhitelisted = await registry.isWhitelisted(listing17);
      expect(isWhitelisted).to.be.true("the listing was not added to the registry");

      await registry.exitListing(listing17, { from: applicant });

      const isWhitelistedAfterExit = await registry.isWhitelisted(listing17);
      expect(isWhitelistedAfterExit).to.be.false("the listing was not removed on exit");

      const finalApplicantTokenHoldings = await token.balanceOf(applicant);
      expect(initialApplicantTokenHoldings).to.be.bignumber.equal(finalApplicantTokenHoldings,
        "the applicant\'s tokens were not returned to them after exiting the registry",
      );
    });

    it("should not allow a listing to exit when a challenge does exist", async () => {
      const initialApplicantTokenHoldings = await token.balanceOf(applicant);

      await utils.addToWhitelist(listing18, utils.paramConfig.minDeposit, applicant, registry);

      const isWhitelisted = await registry.isWhitelisted(listing18);
      expect(isWhitelisted).to.be.true("the listing was not added to the registry");

      await registry.challenge(listing18, "", { from: challenger });
      try {
        await registry.exitListing(listing18, { from: applicant });
        expect(false).to.be.true("exit succeeded when it should have failed");
      } catch (err) {
        const errMsg = err.toString();
        expect(utils.isEVMException(err)).to.be.true(errMsg);
      }

      const isWhitelistedAfterExit = await registry.isWhitelisted(listing18);
      expect(isWhitelistedAfterExit).to.be.true(
        "the listing was able to exit while a challenge was active",
      );

      const finalApplicantTokenHoldings = await token.balanceOf(applicant);
      expect(initialApplicantTokenHoldings.gt(finalApplicantTokenHoldings)).to.be.true(
        "the applicant\'s tokens were returned in spite of failing to exit",
      );

      // Clean up state, remove consensys.net (it fails its challenge due to draw)
      await utils.advanceEvmTime(utils.paramConfig.commitStageLength + utils.paramConfig.revealStageLength + 1);
      await registry.updateStatus(listing18);
    });

    it("should not allow a listing to be exited by someone who doesn\'t own it", async () => {
      await utils.addToWhitelist(listing18, utils.paramConfig.minDeposit, applicant, registry);

      try {
        await registry.exitListing(listing18, { from: voter });
        expect(false).to.be.true("exit succeeded when it should have failed");
      } catch (err) {
        const errMsg = err.toString();
        expect(utils.isEVMException(err)).to.be.true(errMsg);
      }
      const isWhitelistedAfterExit = await registry.isWhitelisted(listing18);
      expect(isWhitelistedAfterExit).to.be.true(
        "the listing was exited by someone other than its owner",
      );
    });
  });
});
