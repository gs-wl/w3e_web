const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy RWA Token
  console.log("\n=== Deploying RWA Token ===");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  
  const tokenName = "RWA Token";
  const tokenSymbol = "RWA";
  const owner = deployer.address;
  const feeCollector = deployer.address; // Using deployer as fee collector for simplicity
  
  console.log("Deployment parameters:");
  console.log("- Name:", tokenName);
  console.log("- Symbol:", tokenSymbol);
  console.log("- Owner:", owner);
  console.log("- Fee Collector:", feeCollector);
  
  const rwaToken = await RWAToken.deploy(tokenName, tokenSymbol, owner, feeCollector);
  await rwaToken.waitForDeployment();
  
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log("RWA Token deployed to:", rwaTokenAddress);
  
  // Verify initial state
  console.log("\n=== RWA Token Initial State ===");
  console.log("Total Supply:", ethers.formatEther(await rwaToken.totalSupply()));
  console.log("Max Supply:", ethers.formatEther(await rwaToken.MAX_SUPPLY()));
  console.log("Decimals:", await rwaToken.decimals());
  console.log("Owner Balance:", ethers.formatEther(await rwaToken.balanceOf(owner)));

  // Deploy Staking Contract
  console.log("\n=== Deploying Multi Pool Staking ===");
  const MultiPoolStaking = await ethers.getContractFactory("MultiPoolStaking");
  const stakingContract = await MultiPoolStaking.deploy();
  await stakingContract.waitForDeployment();
  
  const stakingAddress = await stakingContract.getAddress();
  console.log("Multi Pool Staking deployed to:", stakingAddress);

  // Add initial staking pool
  console.log("\n=== Setting up Initial Staking Pool ===");
  const poolMaxStake = ethers.parseEther("1000000"); // 1M tokens
  const poolMinStake = ethers.parseEther("100"); // 100 tokens
  const rewardRate = ethers.parseEther("0.1"); // 0.1 tokens per second
  const lockPeriod = 86400; // 1 day in seconds
  
  console.log("Pool parameters:");
  console.log("- Staking Token:", rwaTokenAddress);
  console.log("- Max Stake Limit:", ethers.formatEther(poolMaxStake));
  console.log("- Min Stake Amount:", ethers.formatEther(poolMinStake));
  console.log("- Reward Rate:", ethers.formatEther(rewardRate), "tokens per second");
  console.log("- Lock Period:", lockPeriod, "seconds");
  
  const addPoolTx = await stakingContract.addPool(
    rwaTokenAddress,
    poolMaxStake,
    poolMinStake,
    rewardRate,
    lockPeriod
  );
  await addPoolTx.wait();
  
  console.log("Initial pool added successfully!");
  
  // Verify pool creation
  const poolInfo = await stakingContract.getPoolInfo(0);
  console.log("\n=== Pool 0 Information ===");
  console.log("- Staking Token:", poolInfo.stakingToken);
  console.log("- Total Staked:", ethers.formatEther(poolInfo.totalStaked));
  console.log("- Max Stake Limit:", ethers.formatEther(poolInfo.maxStakeLimit));
  console.log("- Min Stake Amount:", ethers.formatEther(poolInfo.minStakeAmount));
  console.log("- Reward Rate:", ethers.formatEther(poolInfo.rewardRate));
  console.log("- Is Active:", poolInfo.isActive);
  console.log("- Lock Period:", poolInfo.lockPeriod.toString());

  // Setup for testing (optional)
  console.log("\n=== Optional: Setting up for testing ===");
  
  // Check if we can mint (cooldown check)
  const cooldownRemaining = await rwaToken.mintCooldownRemaining();
  if (cooldownRemaining > 0) {
    console.log("⚠️  Minting cooldown active. Remaining time:", cooldownRemaining.toString(), "seconds");
    console.log("Skipping test token minting. Use the initial supply for testing.");
  } else {
    // Mint some additional tokens for testing
    const testMintAmount = ethers.parseEther("1000000"); // 1M tokens for testing
    console.log("Minting", ethers.formatEther(testMintAmount), "tokens for testing...");
    
    const mintTx = await rwaToken.mint(deployer.address, testMintAmount);
    await mintTx.wait();
    
    console.log("Test tokens minted successfully!");
    console.log("New total supply:", ethers.formatEther(await rwaToken.totalSupply()));
    console.log("Deployer balance:", ethers.formatEther(await rwaToken.balanceOf(deployer.address)));
  }

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("✅ RWA Token:", rwaTokenAddress);
  console.log("✅ Multi Pool Staking:", stakingAddress);
  console.log("✅ Initial pool created (Pool ID: 0)");
  console.log("✅ Test tokens minted");
  
  console.log("\n=== Next Steps ===");
  console.log("1. Approve staking contract to spend your tokens:");
  console.log(`   rwaToken.approve("${stakingAddress}", amount)`);
  console.log("2. Stake tokens in pool 0:");
  console.log(`   stakingContract.stake(0, amount)`);
  console.log("3. Check rewards:");
  console.log(`   stakingContract.pendingRewards(0, yourAddress)`);
  
  return {
    rwaToken: rwaTokenAddress,
    stakingContract: stakingAddress
  };
}

// Execute deployment
main()
  .then((addresses) => {
    console.log("\n🎉 Deployment completed successfully!");
    console.log("Contract addresses:", addresses);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });