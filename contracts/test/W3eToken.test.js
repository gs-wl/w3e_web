const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("W3EToken", function () {
  let w3eToken;
  let owner, addr1, addr2, feeCollector;
  
  const TOKEN_NAME = "W3E Token";
  const TOKEN_SYMBOL = "W3E";
  const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M tokens
  const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1B tokens

  beforeEach(async function () {
    [owner, addr1, addr2, feeCollector] = await ethers.getSigners();
    
    const W3EToken = await ethers.getContractFactory("W3EToken");
    w3eToken = await W3EToken.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      owner.address,
      feeCollector.address
    );
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await w3eToken.name()).to.equal(TOKEN_NAME);
      expect(await w3eToken.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the right decimals", async function () {
      expect(await w3eToken.decimals()).to.equal(18);
    });

    it("Should mint initial supply to owner", async function () {
      expect(await w3eToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should set owner as authorized minter", async function () {
      expect(await w3eToken.authorizedMinters(owner.address)).to.be.true;
    });

    it("Should set owner as fee exempt", async function () {
      expect(await w3eToken.feeExempt(owner.address)).to.be.true;
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
      
      await w3eToken.mint(addr1.address, mintAmount);
      expect(await w3eToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should revert if non-authorized tries to mint", async function () {
      const mintAmount = ethers.parseEther("1000000");
      
      await expect(
        w3eToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(w3eToken, "UnauthorizedMinter");
    });

    it("Should enforce minting cap", async function () {
      const mintingCap = await w3eToken.mintingCap();
      const excessAmount = mintingCap + ethers.parseEther("1");
      
      await expect(
        w3eToken.mint(addr1.address, excessAmount)
      ).to.be.revertedWithCustomError(w3eToken, "MintingCapExceeded");
    });

    it("Should enforce supply cap", async function () {
      // First, increase the minting cap to be higher than remaining supply
      const remainingSupply = await w3eToken.remainingSupply();
      const newMintingCap = remainingSupply + ethers.parseEther("1000000");
      await w3eToken.setMintingCap(newMintingCap);
      
      // Now try to mint more than the remaining supply
      const excessAmount = remainingSupply + ethers.parseEther("1");
      
      await expect(
        w3eToken.mint(addr1.address, excessAmount)
      ).to.be.revertedWithCustomError(w3eToken, "SupplyCapExceeded");
    });

    it("Should enforce minting cooldown", async function () {
      const mintAmount = ethers.parseEther("1000000");
      
      // First mint should succeed
      await w3eToken.mint(addr1.address, mintAmount);
      
      // Second mint immediately should fail due to cooldown
      await expect(
        w3eToken.mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(w3eToken, "MintingCooldownActive");
    });
  });

  describe("Transfer Fees", function () {
    beforeEach(async function () {
      // Set 1% transfer fee
      await w3eToken.setTransferFee(100, feeCollector.address);
      // Transfer some tokens to addr1 for testing
      await w3eToken.transfer(addr1.address, ethers.parseEther("1000"));
    });

    it("Should charge transfer fee", async function () {
      const transferAmount = ethers.parseEther("100");
      const expectedFee = transferAmount * 100n / 10000n; // 1%
      
      const initialBalance = await w3eToken.balanceOf(addr1.address);
      const initialFeeCollectorBalance = await w3eToken.balanceOf(feeCollector.address);
      
      await w3eToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      expect(await w3eToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await w3eToken.balanceOf(feeCollector.address)).to.equal(
        initialFeeCollectorBalance + expectedFee
      );
      expect(await w3eToken.balanceOf(addr1.address)).to.equal(
        initialBalance - transferAmount - expectedFee
      );
    });

    it("Should not charge fee for exempt addresses", async function () {
      await w3eToken.setFeeExemption(addr1.address, true);
      
      const transferAmount = ethers.parseEther("100");
      const initialBalance = await w3eToken.balanceOf(addr1.address);
      
      await w3eToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      expect(await w3eToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await w3eToken.balanceOf(addr1.address)).to.equal(
        initialBalance - transferAmount
      );
    });
  });

  describe("Blacklist", function () {
    it("Should prevent blacklisted address from transferring", async function () {
      await w3eToken.transfer(addr1.address, ethers.parseEther("100"));
      await w3eToken.setBlacklisted(addr1.address, true);
      
      await expect(
        w3eToken.connect(addr1).transfer(addr2.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(w3eToken, "BlacklistedAddress");
    });

    it("Should prevent transfers to blacklisted address", async function () {
      await w3eToken.setBlacklisted(addr2.address, true);
      
      await expect(
        w3eToken.transfer(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(w3eToken, "BlacklistedAddress");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should pause and unpause transfers", async function () {
      await w3eToken.pause();
      
      await expect(
        w3eToken.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(w3eToken, "ContractPaused");
      
      await w3eToken.unpause();
      await expect(
        w3eToken.transfer(addr1.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
    });
  });

  describe("Voting", function () {
    it("Should track voting power correctly", async function () {
      const amount = ethers.parseEther("1000");
      await w3eToken.transfer(addr1.address, amount);
      
      expect(await w3eToken.getVotes(addr1.address)).to.equal(0);
      
      // Self-delegate to activate voting power
      await w3eToken.connect(addr1).delegate(addr1.address);
      expect(await w3eToken.getVotes(addr1.address)).to.equal(amount);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set authorized minter", async function () {
      await w3eToken.setAuthorizedMinter(addr1.address, true);
      expect(await w3eToken.authorizedMinters(addr1.address)).to.be.true;
    });

    it("Should allow owner to update minting cap", async function () {
      const newCap = ethers.parseEther("5000000");
      await w3eToken.setMintingCap(newCap);
      expect(await w3eToken.mintingCap()).to.equal(newCap);
    });

    it("Should revert if non-owner tries admin functions", async function () {
      await expect(
        w3eToken.connect(addr1).setAuthorizedMinter(addr2.address, true)
      ).to.be.revertedWithCustomError(w3eToken, "OwnableUnauthorizedAccount");
    });
  });
});