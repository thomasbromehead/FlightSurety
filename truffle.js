var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");

module.exports = {
  networks: {
    dev: {
      provider: function() {
        var wallet = new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
        var nonceTracker = new NonceTrackerSubprovider();
        wallet.engine._providers.unshift(nonceTracker);
        nonceTracker.setEngine(wallet.engine);
        return wallet
      },
      network_id: '*',
    },
    truffle: {
      provider: function() {
        var wallet = new HDWalletProvider("era cousin feed access black cash fence spike guard village into decide", "http://127.0.0.1:9545/", 0, 50);
        var nonceTracker = new NonceTrackerSubprovider();
        wallet.engine._providers.unshift(nonceTracker);
        nonceTracker.setEngine(wallet.engine);
        return wallet
      },
      network_id: '*',
      gas: 5500000,
      gasPrice: 21000000000,
    }
  },
  compilers: {
    solc: {
      version: "0.6.0",
      parser: "solcjs",
      docker: true
    }
  }
};