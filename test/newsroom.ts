import * as chai from "chai";
import { REVERTED } from "../utils/constants";
import ChaiConfig from "./utils/chaiconfig";

const Newsroom = artifacts.require("Newsroom");

ChaiConfig();
const expect = chai.expect;

contract("Newsroom", () => {
    let newsroom: any;

    before(async () => {
        newsroom = await Newsroom.deployed();
    });

    describe("author", () => {
    });

    describe("uri", () => {

    });

    describe("timestamp", () => {

    });

    describe("proposeArticle", () => {
        it("forbids empty uris", async () => {
            expect(newsroom.proposeArticle("")).to.be.rejectedWith(REVERTED);
        });
    });

    describe("approveArticle", () => {

    });

    describe("denyArticle", () => {
    });
});
