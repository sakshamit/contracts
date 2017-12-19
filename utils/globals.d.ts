declare module "dirty-chai";
declare module "chai-bignumber";

declare namespace Chai {
    interface Assertion {
        bignumber: Assertion;
    }
}

// Injected by truffle
declare var artifacts: { require: (name: string) => any };
declare var contract: (contractName: string, tests: (accounts: string[]) => void ) => void;
declare var describe: (functionName: string, tests: () => void) => void;
declare var it: (description: string, test: () => void) => void;
declare var before: (func: () => void) => void;