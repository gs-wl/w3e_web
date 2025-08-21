const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiPoolStaking", function () {
  let stakingContract;
  let rwaToken;
  let owner, addr1, addr2, feeCollector;
  
  const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M tokens
  const POOL_MAX_STAKE = ethers.parseEther("1000000"); // 1M tokens
  const POOL_MIN_STAKE = ethers.parseEther("100"); // 100 tokens
  const REWARD_RATE = ethers.parseEther("1"); // 1 token per second
  const LOCK_PERIOD = 86400; // 1 day

  beforeEach(async function () {
    [owner, addr1, addr2, feeCollector] = await ethers.getSigners();
    
    // Deploy RWA Token first
    const RWAToken = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWAToken.deploy(
      "RWA Token",
      "RWA",
      owner.address,
      feeCollector.address
    );
    
    // Deploy Staking Contract
    const MultiPoolStaking = await ethers.getContractFactory("MultiPoolStaking");
    stakingContract = await MultiPoolStaking.deploy();
    
    // Add a pool
    await stakingContract.addPool(
      await rwaToken.getAddress(),
      POOL_MAX_STAKE,
      POOL_MIN_STAKE,
      REWARD_RATE,
      LOCK_PERIOD
    );
    
    // Fast forward past minting cooldown and mint more tokens for rewards
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    
    // Mint tokens for rewards pool (transfer to staking contract)
    const rewardTokens = ethers.parseEther("1000000"); // 1M tokens for rewards
    await rwaToken.mint(await stakingContract.getAddress(), rewardTokens);
    
    // Transfer tokens to test addresses
    await rwaToken.transfer(addr1.address, ethers.parseEther("50000"));
    await rwaToken.transfer(addr2.address, ethers.parseEther("50000"));
    
    // Approve staking contract with higher amounts
    await rwaToken.connect(addr1).approve(await stakingContract.getAddress(), ethers.parseEther("50000"));
    await rwaToken.connect(addr2).approve(await stakingContract.getAddress(), ethers.parseEther("50000"));
  });

  describe("Pool Management", function () {
    it("Should add pool correctly", async function () {
      const poolInfo = await stakingContract.getPoolInfo(0);
      expect(poolInfo.stakingToken).to.equal(await rwaToken.getAddress());
      expect(poolInfo.maxStakeLimit).to.equal(POOL_MAX_STAKE);
      expect(poolInfo.minStakeAmount).to.equal(POOL_MIN_STAKE);
      expect(poolInfo.rewardRate).to.equal(REWARD_RATE);
      expect(poolInfo.lockPeriod).to.equal(LOCK_PERIOD);
      expect(poolInfo.isActive).to.be.true;
    });

    it("Should update pool parameters", async function () {
      const newMaxStake = ethers.parseEther("2000000");
      const newRewardRate = ethers.parseEther("2");
      
      await stakingContract.updatePool(
        0,
        newMaxStake,
        POOL_MIN_STAKE,
        newRewardRate,
        LOCK_PERIOD,
        true
      );
      
      const poolInfo = await stakingContract.getPoolInfo(0);
      expect(poolInfo.maxStakeLimit).to.equal(newMaxStake);
      expect(poolInfo.rewardRate).to.equal(newRewardRate);
    });

    it("Should revert if non-owner tries to add pool", async function () {
      await expect(
        stakingContract.connect(addr1).addPool(
          await rwaToken.getAddress(),
          POOL_MAX_STAKE,
          POOL_MIN_STAKE,
          REWARD_RATE,
          LOCK_PERIOD
        )
      ).to.be.revertedWithCustomError(stakingContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Staking", function () {
    it("Should allow user to stake tokens", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      await stakingContract.connect(addr1).stake(0, stakeAmount);
      
      const userInfo = await stakingContract.getUserInfo(0, addr1.address);
      expect(userInfo.stakedAmount).to.equal(stakeAmount);
      
      const poolInfo = await stakingContract.getPoolInfo(0);
      expect(poolInfo.totalStaked).to.equal(stakeAmount);
    });

    it("Should revert if staking below minimum", async function () {
      const stakeAmount = ethers.parseEther("50"); // Below minimum
      
      await expect(
        stakingContract.connect(addr1).stake(0, stakeAmount)
      ).to.be.revertedWith("Amount below minimum stake");
    });

    it("Should revert if exceeding pool limit", async function () {
      const stakeAmount = POOL_MAX_STAKE + ethers.parseEther("1");
      
      // Use existing balance instead of minting (to avoid cooldown issues)
      // First, let's try to stake the maximum amount first
      await stakingContract.connect(addr1).stake(0, ethers.parseEther("50000"));
      
      // Now try to stake more than the remaining limit
      const remainingLimit = POOL_MAX_STAKE - ethers.parseEther("50000");
      const excessAmount = remainingLimit + ethers.parseEther("1");
      
      await expect(
        stakingContract.connect(addr2).stake(0, excessAmount)
      ).to.be.revertedWith("Pool stake limit exceeded");
    });

    it("Should accumulate rewards over time", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      await stakingContract.connect(addr1).stake(0, stakeAmount);
      
      // Wait some time (simulate by mining blocks)
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");
      
      const pendingRewards = await stakingContract.pendingRewards(0, addr1.address);
      expect(pendingRewards).to.be.gt(0);
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther("1000");
      await stakingContract.connect(addr1).stake(0, stakeAmount);
    });

    it("Should allow unstaking after lock period", async function () {
      // Fast forward past lock period
      await ethers.provider.send("evm_increaseTime", [LOCK_PERIOD + 1]);
      await ethers.provider.send("evm_mine");
      
      const unstakeAmount = ethers.parseEther("500");
      const initialBalance = await rwaToken.balanceOf(addr1.address);
      
      await stakingContract.connect(addr1).unstake(0, unstakeAmount);
      
      const finalBalance = await rwaToken.balanceOf(addr1.address);
      expect(finalBalance).to.equal(initialBalance + unstakeAmount);
      
      const userInfo = await stakingContract.getUserInfo(0, addr1.address);
      expect(userInfo.stakedAmount).to.equal(ethers.parseEther("500"));
    });

    it("Should revert if trying to unstake during lock period", async function () {
      const unstakeAmount = ethers.parseEther("500");
      
      await expect(
        stakingContract.connect(addr1).unstake(0, unstakeAmount)
      ).to.be.revertedWith("Tokens are still locked");
    });

    it("Should revert if trying to unstake more than staked", async function () {
      await ethers.provider.send("evm_increaseTime", [LOCK_PERIOD + 1]);
      await ethers.provider.send("evm_mine");
      
      const unstakeAmount = ethers.parseEther("2000"); // More than staked
      
      await expect(
        stakingContract.connect(addr1).unstake(0, unstakeAmount)
      ).to.be.revertedWith("Insufficient staked amount");
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther("1000");
      await stakingContract.connect(addr1).stake(0, stakeAmount);
      
      // Wait some time to accumulate rewards
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");
    });

    it("Should allow claiming rewards", async function () {
      const initialBalance = await rwaToken.balanceOf(addr1.address);
      const pendingRewards = await stakingContract.pendingRewards(0, addr1.address);
      
      expect(pendingRewards).to.be.gt(0);
      
      await stakingContract.connect(addr1).claimRewards(0);
      
      const finalBalance = await rwaToken.balanceOf(addr1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      const userInfo = await stakingContract.getUserInfo(0, addr1.address);
      expect(userInfo.pendingRewards).to.equal(0);
    });

    it("Should revert if no rewards to claim", async function () {
      // Use a completely fresh address that hasn't staked anything
      const [, , , freshAddr] = await ethers.getSigners();
      
      // Try to claim rewards without staking anything
      await expect(
        stakingContract.connect(freshAddr).claimRewards(0)
      ).to.be.revertedWith("No rewards to claim");
    });
  });

  describe("Emergency Unstake", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther("1000");
      await stakingContract.connect(addr1).stake(0, stakeAmount);
    });

    it("Should allow emergency unstake with fee", async function () {
      const initialBalance = await rwaToken.balanceOf(addr1.address);
      const stakedAmount = ethers.parseEther("1000");
      const emergencyFee = await stakingContract.emergencyWithdrawFee();
      const expectedFee = (stakedAmount * emergencyFee) / 10000n;
      const expectedAmount = stakedAmount - expectedFee;
      
      await stakingContract.connect(addr1).emergencyUnstake(0);
      
      const finalBalance = await rwaToken.balanceOf(addr1.address);
      expect(finalBalance).to.equal(initialBalance + expectedAmount);
      
      const userInfo = await stakingContract.getUserInfo(0, addr1.address);
      expect(userInfo.stakedAmount).to.equal(0);
      expect(userInfo.pendingRewards).to.equal(0);
    });
  });

  describe("View Functions", function () {
    it("Should return correct pool utilization", async function () {
      const stakeAmount = ethers.parseEther("10000"); // Use smaller amount that we know addr1 has
      
      await stakingContract.connect(addr1).stake(0, stakeAmount);
      
      const utilization = await stakingContract.getPoolUtilization(0);
      expect(utilization).to.equal(1); // 1% (10000 / 1000000 * 100)
    });

    it("Should return all pools", async function () {
      const allPools = await stakingContract.getAllPools();
      expect(allPools.length).to.equal(1);
      expect(allPools[0].stakingToken).to.equal(await rwaToken.getAddress());
    });

    it("Should return user staked pools", async function () {
      await stakingContract.connect(addr1).stake(0, ethers.parseEther("1000"));
      
      const stakedPools = await stakingContract.getUserStakedPools(addr1.address);
      expect(stakedPools.length).to.equal(1);
      expect(stakedPools[0]).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set emergency withdraw fee", async function () {
      const newFee = 1000; // 10%
      await stakingContract.setEmergencyWithdrawFee(newFee);
      expect(await stakingContract.emergencyWithdrawFee()).to.equal(newFee);
    });

    it("Should allow owner to pause/unpause", async function () {
      await stakingContract.pause();
      
      await expect(
        stakingContract.connect(addr1).stake(0, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(stakingContract, "EnforcedPause");
      
      await stakingContract.unpause();
      await expect(
        stakingContract.connect(addr1).stake(0, ethers.parseEther("1000"))
      ).to.not.be.reverted;
    });

    it("Should allow owner to collect fees", async function () {
      // First create some fees through emergency unstake
      await stakingContract.connect(addr1).stake(0, ethers.parseEther("1000"));
      await stakingContract.connect(addr1).emergencyUnstake(0);
      
      const ownerInitialBalance = await rwaToken.balanceOf(owner.address);
      const feeAmount = ethers.parseEther("10");
      
      await stakingContract.collectFees(0, feeAmount);
      
      const ownerFinalBalance = await rwaToken.balanceOf(owner.address);
      expect(ownerFinalBalance).to.equal(ownerInitialBalance + feeAmount);
    });
  });
});