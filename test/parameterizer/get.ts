import * as chai from "chai";
import * as fs from "fs";
import ChaiConfig from "../utils/chaiconfig";

const Parameterizer = artifacts.require("Parameterizer");

ChaiConfig();
const expect = chai.expect;
const config = JSON.parse(fs.readFileSync("./conf/config.json").toString());
const paramConfig = config.paramDefaults;

contract("Parameterizer", () => {
  describe("get", () => {
    let parameterizer: any;

    before(async () => {
      // await createTestParameterizerInstance(accounts);
      parameterizer = await Parameterizer.deployed();
    });

    it("should get a parameter", async () => {
      const result = await parameterizer.get("minDeposit");
      expect(result.toString()).to.be.equal(paramConfig.minDeposit.toString(), "minDeposit param has wrong value");
    });
  });
});
