import BN from "bignumber.js";
import * as chai from "chai";
import ChaiConfig from "../utils/chaiconfig";
import * as utils from "../utils/contractutils";

const AddressRegistry = artifacts.require("AddressRegistry");

ChaiConfig();
const expect = chai.expect;

contract("Registry", (accounts) => {
  describe("Function: withdraw", () => {
    const minDeposit = utils.bigTen(utils.paramConfig.minDeposit);
    const withdrawAmount = minDeposit.div(utils.bigTen(2));
    const [applicant, challenger] = accounts;
    const dontChallengeListing = "0x0000000000000000000000000000000000000014";
    const listing13 = "0x00000000000000000000000000000000000000013";
    let registry: any;

    before(async () => {
      registry = await AddressRegistry.deployed();
    });

    it("should not withdraw tokens from a listing that has a deposit === minDeposit", async () => {
      const errMsg = "applicant was able to withdraw tokens";

      await utils.addToWhitelist(dontChallengeListing, minDeposit, applicant, registry);
      const origDeposit = await utils.getUnstakedDeposit(dontChallengeListing, registry);

      try {
        await registry.withdraw(dontChallengeListing, withdrawAmount, { from: applicant });
        expect(false).to.be.true(errMsg);
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
      }

      const afterWithdrawDeposit = await utils.getUnstakedDeposit(dontChallengeListing, registry);

      expect(afterWithdrawDeposit).to.be.bignumber.equal(origDeposit, errMsg);
    });

    it("should not withdraw tokens from a listing that is locked in a challenge", async () => {
      // Whitelist, then challenge
      await utils.addToWhitelist(listing13, minDeposit, applicant, registry);
      await registry.challenge(listing13, "", { from: challenger });

      try {
        // Attempt to withdraw; should fail
        await registry.withdraw(listing13, withdrawAmount, { from: applicant });
        expect(false).to.be.true("Applicant should not have been able to withdraw from a challenged, locked listing");
      } catch (err) {
        const errMsg = err.toString();
        expect(utils.isEVMException(err)).to.be.true(errMsg);
      }
      // TODO: check balance
      // TODO: apply, gets challenged, and then minDeposit lowers during challenge.
      // still shouldn"t be able to withdraw anything.
      // when challenge ends, should be able to withdraw origDeposit - new minDeposit
    });
  });
});

