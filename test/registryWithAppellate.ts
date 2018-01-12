import * as chai from "chai";
import { events, REVERTED } from "../utils/constants";
import ChaiConfig from "./utils/chaiconfig";
import { findEvent, idFromEvent, is0x0Address, timestampFromTx } from "./utils/contractutils";

const RegistryWithAppellate = artifacts.require("RegistryWithAppellate");

ChaiConfig();
const expect = chai.expect;

const EXISTING_LISTING_HASH = 0xf97f3f58a5fe44396d3abecdf8ec99639c2abf3e8c8117120234a5d705ceed93; // sha3 of 'test'
const NO_LISTING_HASH = 0x22865775ff5cb88ab55adf78cbbca82f0b71ea058ee0c8ed220639efac0705da; // sha3 of 'NO LISTING'

// TODO: Revisit and add many more tests after RegistryWtihAppellate extends real TCR
contract("RegistryWithAppellate", (accounts: string[]) => {
  const defaultAccount = accounts[0];
  let registry: any;
  let id: any;

  beforeEach(async () => {
    registry = await RegistryWithAppellate.new();
    const tx = await registry.submitAppeal(EXISTING_LISTING_HASH, { from: accounts[1] });
    id = idFromEvent(tx);
  });

  describe("owner", () => {
    it("returns 0x0 on non-existent listing", async () => {
      const is0x0 = is0x0Address(await registry.listingOwner(NO_LISTING_HASH));
      expect(is0x0).to.be.true();
    });

    it("returns correct owner for existing listing", async () => {
      expect(await registry.listingOwner(EXISTING_LISTING_HASH)).to.be.equal(accounts[1]);
    });

    it("returns 0x0 on denied listing", async () => {
      await expect(registry.denyAppeal(EXISTING_LISTING_HASH, { from : defaultAccount })).to.eventually.be.fulfilled();
      const is0x0 = is0x0Address(await registry.listingOwner(EXISTING_LISTING_HASH));
      expect(is0x0).to.be.true();
    });
  });

  describe("appeal", () => {
    it("cannot be granted by non-owner of registry", async () => {
      await expect(registry.grantAppeal(EXISTING_LISTING_HASH, { from : accounts[1] })).to.be.rejectedWith(REVERTED);
    });

    it("cannot be denied by non-owner of registry", async () => {
      await expect(registry.denyAppeal(EXISTING_LISTING_HASH, { from : accounts[1] })).to.be.rejectedWith(REVERTED);
    });

    it("fails on granting appeal of non-existent listing", async () => {
      await expect(registry.grantAppeal(NO_LISTING_HASH, { from : defaultAccount })).to.be.rejectedWith(REVERTED);
    });

    it("fails on denying appeal of non-existent listing", async () => {
      await expect(registry.denyAppeal(NO_LISTING_HASH, { from : defaultAccount })).to.be.rejectedWith(REVERTED);
    });
  });

  describe("submit appeal", () => {
    it("fails on listing already present", async () => {
      await expect(registry.submitAppeal(EXISTING_LISTING_HASH, { from: accounts[1] })).to.be.rejectedWith(REVERTED);
    });
    it("succeeds on listing not already present", async () => {
      await expect(registry.submitAppeal(NO_LISTING_HASH, { from: accounts[1] })).to.eventually.be.fulfilled();
    });
  });

  describe("grant appeal", () => {
    it("succeeds on existent non-whitelisted listing", async () => {
      await expect(registry.grantAppeal(EXISTING_LISTING_HASH, { from : defaultAccount })).to.eventually.be.fulfilled();
    });

    it("fails on already whitelisted listing", async () => {
      await registry.grantAppeal(EXISTING_LISTING_HASH, { from : defaultAccount });
      await expect(registry.grantAppeal(EXISTING_LISTING_HASH, { from : defaultAccount })).to.be.rejectedWith(REVERTED);
    });
  });

  describe("deny appeal", () => {
    it("succeeds on existent non-whitelisted listing", async () => {
      await expect(registry.denyAppeal(EXISTING_LISTING_HASH, { from : defaultAccount })).to.eventually.be.fulfilled();
    });

    it("fails on already whitelisted listing", async () => {
      await registry.grantAppeal(EXISTING_LISTING_HASH, { from : defaultAccount});
      await expect(registry.denyAppeal(EXISTING_LISTING_HASH, { from : defaultAccount })).to.be.rejectedWith(REVERTED);
    });

    it("fails on already denied listing", async () => {
      await registry.denyAppeal(EXISTING_LISTING_HASH, { from : defaultAccount});
      await expect(registry.denyAppeal(EXISTING_LISTING_HASH, { from : defaultAccount })).to.be.rejectedWith(REVERTED);
    });
  });

  describe("listing", () => {
    it("is not whitelisted before appeal granted", async () => {
      expect(await registry.isWhitelisted(EXISTING_LISTING_HASH)).to.be.false();
    });
    it("is whitelisted after appeal granted", async () => {
      await registry.grantAppeal(EXISTING_LISTING_HASH, { from : defaultAccount });
      expect(await registry.isWhitelisted(EXISTING_LISTING_HASH)).to.be.true();
    });
  });
});
