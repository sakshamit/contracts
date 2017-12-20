import * as chai from "chai";
import { events, REVERTED } from "../utils/constants";
import ChaiConfig from "./utils/chaiconfig";
import { findEvent, idFromEvent, is0x0Address } from "./utils/contractutils";

const Newsroom = artifacts.require("Newsroom");

ChaiConfig();
const expect = chai.expect;

const SOME_URI = "http://thiistest.uri";

contract("Newsroom", (accounts: string[]) => {
    const defaultAccount = accounts[0];
    let newsroom: any;

    before(async () => {
        newsroom = await Newsroom.deployed();
    });

    describe("author", () => {
        let id: any;

        beforeEach(async () => {
            const tx = await newsroom.proposeArticle(SOME_URI, {from: accounts[1]});
            id = idFromEvent(tx);
        });

        it("returns 0x0 on non-existent articles", async () => {
            const is0x0 = is0x0Address(await newsroom.author(9999));
            expect(is0x0).to.be.true();
        });

        it("returns proper author", async () => {
            await expect(
                newsroom.author(id, {from: defaultAccount})).to.eventually.be.equal(accounts[1]);
        });

        it("works for approved articles", async () => {
            await newsroom.approveArticle(id);

            await expect(newsroom.author(id)).to.eventually.be.equal(accounts[1]);
        });

        it("returns 0x0 on denied articles", async () => {
            await newsroom.denyArticle(id);

            const is0x0 = is0x0Address(await newsroom.author(id));
            expect(is0x0).to.be.true();
        });
    });

    describe("uri", () => {
        let id: any;

        beforeEach(async () => {
            const tx = await newsroom.proposeArticle(SOME_URI);
            id = idFromEvent(tx);
        });

        it("returns empty string on non-existen articles", async () => {
            await expect(newsroom.uri(9999)).to.eventually.be.equal("");
        });

        it("returns proper uri", async () => {
            await expect(newsroom.uri(id)).to.eventually.be.equal(SOME_URI);
        });

        it("works on approved articles", async () => {
            await newsroom.approveArticle(id);

            await expect(newsroom.uri(id)).to.eventually.be.equal(SOME_URI);
        });

        it("returns empty string on denied articles", async () => {
            await newsroom.denyArticle(id);

            await expect(newsroom.uri(id)).to.eventually.be.equal("");
        });
    });

    describe("timestamp", () => {
    });

    describe("isProposed", () => {

    });

    describe("isApproved", () => {

    });

    describe("proposeArticle", () => {
        it("forbids empty uris", async () => {
            await expect(newsroom.proposeArticle("")).to.be.rejectedWith(REVERTED);
        });

        it("finishes", async () => {
            await expect(newsroom.proposeArticle(SOME_URI)).to.eventually.be.fulfilled();
        });

        it("creates an event", async () => {
            const tx = await newsroom.proposeArticle(SOME_URI);
            const event = findEvent(tx, events.PROPOSED);
            expect(event).to.not.be.undefined();
            expect(event.args.author).to.be.equal(defaultAccount);
        });
    });

    describe("approveArticle", () => {
        let id: any;

        beforeEach(async () => {
            const tx = await newsroom.proposeArticle(SOME_URI);
            id = idFromEvent(tx);
        });

        it("allows approving", async () => {
            await expect(newsroom.approveArticle(id)).to.eventually.be.fulfilled();
        });

        it("forbids not owners", async () => {
            await expect(
                newsroom.approveArticle(id, {from: accounts[1]}))
                .to.be.rejectedWith(REVERTED);
        });

        it("fires an event", async () => {
            const tx = await newsroom.approveArticle(id);
            const event = findEvent(tx, events.APPROVED);

            expect(event).to.not.be.undefined();
        });

        it("can't reapprove", async () => {
            await newsroom.approveArticle(id);

            await expect(newsroom.approveArticle(id)).to.be.rejectedWith(REVERTED);
        });

        it("can't deny after", async () => {
            await newsroom.approveArticle(id);

            await expect(newsroom.denyArticle(id)).to.be.rejectedWith(REVERTED);
        });

        it("fails on non-existent id", async () => {
            await expect(newsroom.approveArticle(9999)).to.be.rejectedWith(REVERTED);
        });
    });

    describe("denyArticle", () => {
        let id: any;

        beforeEach(async () => {
            const tx = await newsroom.proposeArticle(SOME_URI);
            id = idFromEvent(tx);
        });

        it("allows denying", async () => {
            await expect(newsroom.denyArticle(id)).to.eventually.be.fulfilled();
        });

        it("forbids not owners", async () => {
            await expect(
                newsroom.denyArticle(id, {from: accounts[1]}))
                .to.be.rejectedWith(REVERTED);
        });

        it("fires an event", async () => {
            const tx = await newsroom.denyArticle(id);
            const event = findEvent(tx, events.DENIED);

            expect(event).to.not.be.undefined();
        });

        it("can't readeny", async () => {
            await newsroom.denyArticle(id);

            await expect(newsroom.denyArticle(id)).to.be.rejectedWith(REVERTED);
        });

        it("can't approve after", async () => {
            await newsroom.denyArticle(id);

            await expect(newsroom.approveArticle(id)).to.be.rejectedWith(REVERTED);
        });

        it("fails on non-existent id", async () => {
            await expect(newsroom.denyArticle(9999)).to.be.rejectedWith(REVERTED);
        });
    });
});
