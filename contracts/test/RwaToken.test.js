const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWAToken", function () {
  let rwaToken;
  let owner, addr1, addr2, feeCollector;
  
  const TOKEN_NAME = "RWA Token";
  const TOKEN_SYMBOL = "RWA";
  const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M tokens
  const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1B tokens

  beforeEach(async function () {
    [owner, addr1, addr2, feeCollector] = await ethers.getSigners();
    
    const RWAToken = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWAToken.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      owner.address,
      feeCollector.address
    );
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await rwaToken.name()).to.equal(TOKEN_NAME);
      expect(await rwaToken.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the right decimals", async function () {
      expect(await rwaToken.decimals()).to.equal(18);
    });

    it("Should mint initial supply to owner", async function () {
      expect(await rwaToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should set owner as authorized minter", async function () {
      expect(await rwaToken.authorizedMinters(owner.address)).to.be.true;
    });

    it("Should set owner as fee exempt", async function () {
      expect(await rwaToken.feeExempt(owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      // Fast forward past the minting cooldown (30 days)
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
    });

    it("Should allow authorized minter to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000000"); // 1M tokens
      
      await rwaToken.mint(addr1.address, mintAmount);
      expect(await rwaToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should revert if non-authorized tries to mint", async function () {
      const mintAmount = ethers.parseEther("1000000");
      
      await expect(
        rwaToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(rwaToken, "UnauthorizedMinter");
    });

    it("Should enforce minting cap", async function () {
      const mintingCap = await rwaToken.mintingCap();
      const excessAmount = mintingCap + ethers.parseEther("1");
      
      await expect(
        rwaToken.mint(addr1.address, excessAmount)
      ).to.be.revertedWithCustomError(rwaToken, "MintingCapExceeded");
    });

    it("Should enforce supply cap", async function () {
      // First, increase the minting cap to be higher than remaining supply
      const remainingSupply = await rwaToken.remainingSupply();
      const newMintingCap = remainingSupply + ethers.parseEther("1000000");
      await rwaToken.setMintingCap(newMintingCap);
      
      // Now try to mint more than the remaining supply
      const excessAmount = remainingSupply + ethers.parseEther("1");
      
      await expect(
        rwaToken.mint(addr1.address, excessAmount)
      ).to.be.revertedWithCustomError(rwaToken, "SupplyCapExceeded");
    });

    it("Should enforce minting cooldown", async function () {
      const mintAmount = ethers.parseEther("1000000");
      
      // First mint should succeed
      await rwaToken.mint(addr1.address, mintAmount);
      
      // Second mint immediately should fail due to cooldown
      await expect(
        rwaToken.mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(rwaToken, "MintingCooldownActive");
    });
  });

  describe("Transfer Fees", function () {
    beforeEach(async function () {
      // Set 1% transfer fee
      await rwaToken.setTransferFee(100, feeCollector.address);
      // Transfer some tokens to addr1 for testing
      await rwaToken.transfer(addr1.address, ethers.parseEther("1000"));
    });

    it("Should charge transfer fee", async function () {
      const transferAmount = ethers.parseEther("100");
      const expectedFee = transferAmount * 100n / 10000n; // 1%
      
      const initialBalance = await rwaToken.balanceOf(addr1.address);
      const initialFeeCollectorBalance = await rwaToken.balanceOf(feeCollector.address);
      
      await rwaToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      expect(await rwaToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await rwaToken.balanceOf(feeCollector.address)).to.equal(
        initialFeeCollectorBalance + expectedFee
      );
      expect(await rwaToken.balanceOf(addr1.address)).to.equal(
        initialBalance - transferAmount - expectedFee
      );
    });

    it("Should not charge fee for exempt addresses", async function () {
      await rwaToken.setFeeExemption(addr1.address, true);
      
      const transferAmount = ethers.parseEther("100");
      const initialBalance = await rwaToken.balanceOf(addr1.address);
      
      await rwaToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      expect(await rwaToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await rwaToken.balanceOf(addr1.address)).to.equal(
        initialBalance - transferAmount
      );
    });
  });

  describe("Blacklist", function () {
    it("Should prevent blacklisted address from transferring", async function () {
      await rwaToken.transfer(addr1.address, ethers.parseEther("100"));
      await rwaToken.setBlacklisted(addr1.address, true);
      
      await expect(
        rwaToken.connect(addr1).transfer(addr2.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(rwaToken, "BlacklistedAddress");
    });

    it("Should prevent transfers to blacklisted address", async function () {
      await rwaToken.setBlacklisted(addr2.address, true);
      
      await expect(
        rwaToken.transfer(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(rwaToken, "BlacklistedAddress");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should pause and unpause transfers", async function () {
      await rwaToken.pause();
      
      await expect(
        rwaToken.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(rwaToken, "ContractPaused");
      
      await rwaToken.unpause();
      await expect(
        rwaToken.transfer(addr1.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
    });
  });

  describe("Voting", function () {
    it("Should track voting power correctly", async function () {
      const amount = ethers.parseEther("1000");
      await rwaToken.transfer(addr1.address, amount);
      
      expect(await rwaToken.getVotes(addr1.address)).to.equal(0);
      
      // Self-delegate to activate voting power
      await rwaToken.connect(addr1).delegate(addr1.address);
      expect(await rwaToken.getVotes(addr1.address)).to.equal(amount);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set authorized minter", async function () {
      await rwaToken.setAuthorizedMinter(addr1.address, true);
      expect(await rwaToken.authorizedMinters(addr1.address)).to.be.true;
    });

    it("Should allow owner to update minting cap", async function () {
      const newCap = ethers.parseEther("5000000");
      await rwaToken.setMintingCap(newCap);
      expect(await rwaToken.mintingCap()).to.equal(newCap);
    });

    it("Should revert if non-owner tries admin functions", async function () {
      await expect(
        rwaToken.connect(addr1).setAuthorizedMinter(addr2.address, true)
      ).to.be.revertedWithCustomError(rwaToken, "OwnableUnauthorizedAccount");
    });
  });
});