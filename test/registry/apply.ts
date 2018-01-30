import BN from "bignumber.js";
import * as chai from "chai";
import ChaiConfig from "../utils/chaiconfig";
import * as utils from "../utils/contractutils";

const AddressRegistry = artifacts.require("AddressRegistry");

ChaiConfig();
const expect = chai.expect;

contract("AddressRegistry", (accounts) => {
  describe("Function: apply", () => {
    const [applicant] = accounts;
    const listing1 = "0x0000000000000000000000000000000000000001";
    let registry: any;

    before(async () => {
      registry = await AddressRegistry.deployed();
    })

    it("should allow a new listing to apply", async () => {
      await registry.apply(listing1, utils.paramConfig.minDeposit, "", {from: applicant });

      // get the struct in the mapping
      const result = await registry.listings.call(listing1);
      // check that Application is initialized correctly
      expect(result[0].gt(0)).to.be.true("challenge time < now");
      expect(result[1]).to.be.false("whitelisted != false");
      expect(result[2]).to.be.equal(applicant, "owner of application != address that applied");
      expect(result[3]).to.be.bignumber.equal(utils.paramConfig.minDeposit,"incorrect unstakedDeposit",
      );
    });

    it("should not allow a listing to apply which has a pending application", async () => {
      try {
        await registry.apply(listing1, utils.paramConfig.minDeposit, "", {from: applicant });
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
        return;
      }
      expect(false).to.be.true("application was made for listing with an already pending application");
    });

    it(
      "should add a listing to the whitelist which went unchallenged in its application period",
      async () => {
        await utils.advanceEvmTime(utils.paramConfig.applyStageLength + 1);
        await registry.updateStatus(listing1);
        const result = await registry.isWhitelisted.call(listing1);
        expect(result).to.be.true("listing didn't get whitelisted");
      },
    );

    it("should not allow a listing to apply which is already listed", async () => {
      try {
        await registry.apply(listing1, utils.paramConfig.minDeposit, "", {from: applicant });
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
        return;
      }
      expect(false).to.be.true("application was made for an already-listed entry");
    });
  });
});

