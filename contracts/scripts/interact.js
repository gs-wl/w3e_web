const { ethers } = require("hardhat");

async function main() {
  console.log("=== Contract Interaction Script ===");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);

  // You'll need to update these addresses after deployment
  const RWA_TOKEN_ADDRESS = ""; // Update after deployment
  const STAKING_ADDRESS = ""; // Update after deployment
  
  if (!RWA_TOKEN_ADDRESS || !STAKING_ADDRESS) {
    console.log("❌ Please update contract addresses in this script after deployment");
    return;
  }

  // Get contract instances
  const rwaToken = await ethers.getContractAt("RWAToken", RWA_TOKEN_ADDRESS);
  const stakingContract = await ethers.getContractAt("MultiPoolStaking", STAKING_ADDRESS);

  console.log("\n=== Contract Information ===");
  console.log("RWA Token:", await rwaToken.getAddress());
  console.log("Staking Contract:", await stakingContract.getAddress());
  
  // Check token info
  console.log("\n=== Token Information ===");
  console.log("Name:", await rwaToken.name());
  console.log("Symbol:", await rwaToken.symbol());
  console.log("Total Supply:", ethers.formatEther(await rwaToken.totalSupply()));
  console.log("Deployer Balance:", ethers.formatEther(await rwaToken.balanceOf(deployer.address)));

  // Transfer tokens to users for testing
  console.log("\n=== Distributing Test Tokens ===");
  const transferAmount = ethers.parseEther("10000");
  
  await rwaToken.transfer(user1.address, transferAmount);
  await rwaToken.transfer(user2.address, transferAmount);
  
  console.log("Transferred", ethers.formatEther(transferAmount), "tokens to each user");
  console.log("User1 Balance:", ethers.formatEther(await rwaToken.balanceOf(user1.address)));
  console.log("User2 Balance:", ethers.formatEther(await rwaToken.balanceOf(user2.address)));

  // Check staking pools
  console.log("\n=== Staking Pool Information ===");
  const poolCount = await stakingContract.poolCount();
  console.log("Total Pools:", poolCount.toString());
  
  if (poolCount > 0) {
    const poolInfo = await stakingContract.getPoolInfo(0);
    console.log("\nPool 0:");
    console.log("- Staking Token:", poolInfo.stakingToken);
    console.log("- Total Staked:", ethers.formatEther(poolInfo.totalStaked));
    console.log("- Max Stake Limit:", ethers.formatEther(poolInfo.maxStakeLimit));
    console.log("- Min Stake Amount:", ethers.formatEther(poolInfo.minStakeAmount));
    console.log("- Reward Rate:", ethers.formatEther(poolInfo.rewardRate), "per second");
    console.log("- Is Active:", poolInfo.isActive);
    console.log("- Lock Period:", poolInfo.lockPeriod.toString(), "seconds");
  }

  // Example staking interaction
  console.log("\n=== Example Staking Interaction ===");
  const stakeAmount = ethers.parseEther("1000");
  
  // Approve staking contract
  console.log("Approving staking contract...");
  await rwaToken.connect(user1).approve(await stakingContract.getAddress(), stakeAmount);
  
  // Stake tokens
  console.log("Staking", ethers.formatEther(stakeAmount), "tokens...");
  await stakingContract.connect(user1).stake(0, stakeAmount);
  
  // Check user info
  const userInfo = await stakingContract.getUserInfo(0, user1.address);
  console.log("User1 Staked Amount:", ethers.formatEther(userInfo.stakedAmount));
  
  // Check pending rewards (should be 0 initially)
  const pendingRewards = await stakingContract.pendingRewards(0, user1.address);
  console.log("Pending Rewards:", ethers.formatEther(pendingRewards));

  console.log("\n✅ Interaction script completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });