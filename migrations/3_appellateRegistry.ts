const RegistryWithAppellate = artifacts.require("RegistryWithAppellate");

export = (deployer: any) => {
  deployer.deploy(RegistryWithAppellate);
};
