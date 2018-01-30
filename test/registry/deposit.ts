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
  describe("Function: deposit", () => {
    const minDeposit = utils.bigTen(utils.paramConfig.minDeposit);
    const incAmount = minDeposit.div(utils.bigTen(2));
    const [applicant, challenger] = accounts;

    const listing13 = "0x0000000000000000000000000000000000000013";
    const listing14 = "0x0000000000000000000000000000000000000014";
    const listing15 = "0x0000000000000000000000000000000000000015";
    const listing16 = "0x0000000000000000000000000000000000000016";
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

    it("should increase the deposit for a specific listing in the listing", async () => {
      await utils.addToWhitelist(listing13, minDeposit, applicant, registry);
      await registry.deposit(listing13, incAmount, { from: applicant });

      const unstakedDeposit = await utils.getUnstakedDeposit(listing13, registry);
      const expectedAmount = incAmount.add(minDeposit);
      expect(unstakedDeposit).to.be.bignumber.equal(expectedAmount,
        "Unstaked deposit should be equal to the sum of the original + increase amount",
      );
    });

    it("should increase a deposit for a pending application", async () => {
      await registry.apply(listing14, minDeposit, "", { from: applicant });

      //try {
        await registry.deposit(listing14, incAmount, { from: applicant });

        const unstakedDeposit = await utils.getUnstakedDeposit(listing14, registry);
        const expectedAmount = incAmount.add(minDeposit);
        expect(unstakedDeposit).to.be.bignumber.equal(expectedAmount, "Deposit should have increased for pending application");
      //} catch (err) {
      //  const errMsg = err.toString();
      //  expect(utils.isEVMException(err)).to.be.true(errMsg);
      //}
    });

    it("should increase deposit for a whitelisted, challenged listing", async () => {
      await utils.addToWhitelist(listing15, minDeposit, applicant, registry);
      const originalDeposit = await utils.getUnstakedDeposit(listing15, registry);

      // challenge, then increase deposit
      await registry.challenge(listing15, "", { from: challenger });
      await registry.deposit(listing15, incAmount, { from: applicant });

      const afterIncDeposit = await utils.getUnstakedDeposit(listing15, registry);

      const expectedAmount = originalDeposit.add(incAmount).sub(minDeposit);

      expect(afterIncDeposit).to.be.bignumber.equal(expectedAmount, "Deposit should have increased for whitelisted, challenged listing");
    });

    it("should not increase deposit for a listing not owned by the msg.sender", async () => {
      await utils.addToWhitelist(listing16, minDeposit, applicant, registry);

      try {
        await registry.deposit(listing16, incAmount, { from: challenger });
        expect(false).to.be.true("Deposit should not have increased when sent by the wrong msg.sender");
      } catch (err) {
        expect(utils.isEVMException(err)).to.be.true(err.toString());
      }
    });
  });
});
