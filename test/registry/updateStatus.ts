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
  describe("Function: updateStatus", () => {
    const [applicant, challenger] = accounts;
    const minDeposit = utils.bigTen(utils.paramConfig.minDeposit);
    const listing21 = "0x0000000000000000000000000000000000000021";
    const listing22 = "0x0000000000000000000000000000000000000022";
    const listing23 = "0x0000000000000000000000000000000000000023";
    const listing24 = "0x0000000000000000000000000000000000000024";
    const listing25 = "0x0000000000000000000000000000000000000025";
    const listing26 = "0x0000000000000000000000000000000000000026";
    let registry: any;

    before(async () => {
      registry = await AddressRegistry.deployed();
    });

    it("should whitelist listing if apply stage ended without a challenge", async () => {
      // note: this function calls registry.updateStatus at the end
      await utils.addToWhitelist(listing21, minDeposit, applicant, registry);

      const result = await registry.isWhitelisted(listing21);
      expect(result).to.be.true("Listing should have been whitelisted");
    });

    it("should not whitelist a listing that is still pending an application", async () => {
      await registry.apply(listing22, minDeposit, "", { from: applicant });

      try {
        await registry.updateStatus(listing22, { from: applicant });
        expect(false).to.be.true("Listing should not have been whitelisted");
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
      }
    });

    it("should not whitelist a listing that is currently being challenged", async () => {
      await registry.apply(listing23, minDeposit, "", { from: applicant });
      await registry.challenge(listing23, "", { from: challenger });

      try {
        await registry.updateStatus(listing23);
        expect(false).to.be.true("Listing should not have been whitelisted");
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
      }
    });

    it("should not whitelist a listing that failed a challenge", async () => {
      await registry.apply(listing24, minDeposit, "", { from: applicant });
      await registry.challenge(listing24, "", { from: challenger });

      const plcrComplete = utils.paramConfig.revealStageLength + utils.paramConfig.commitStageLength + 1;
      await utils.advanceEvmTime(plcrComplete);

      await registry.updateStatus(listing24);
      const result = await registry.isWhitelisted(listing24);
      expect(result).to.be.false("Listing should not have been whitelisted");
    });

    it("should not be possible to add a listing to the whitelist just by calling updateStatus", async () => {
      try {
        await registry.updateStatus(listing25, { from: applicant });
        expect(false).to.be.true("Listing should not have been whitelisted");
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
      }
    });

    it("should not be possible to add a listing to the whitelist just by calling updateStatus after it has been previously removed", async () => {
      await utils.addToWhitelist(listing26, minDeposit, applicant, registry);
      const resultOne = await registry.isWhitelisted(listing26);
      expect(resultOne).to.be.true("Listing should have been whitelisted");

      await registry.exitListing(listing26, { from: applicant });
      const resultTwo = await registry.isWhitelisted(listing26);
      expect(resultTwo).to.be.false("Listing should not be in the whitelist");

      try {
        await registry.updateStatus(listing26, { from: applicant });
        expect(false).to.be.true("Listing should not have been whitelisted");
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
      }
    });
  });
});
