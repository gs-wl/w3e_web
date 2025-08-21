const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Sepolia Deployment...");
  
  // Contract addresses from deployment
  const RWA_TOKEN_ADDRESS = "0x5cfeEc46ABeD58db87a1e2e1873efeecE26a6484";
  const STAKING_ADDRESS = "0x3c122D7571F76a32bE8dbC33255E97156f3A9576";
  
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  
  // Check network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "| Chain ID:", network.chainId.toString());
  
  if (network.chainId !== 11155111n) {
    throw new Error("❌ Not connected to Sepolia testnet");
  }

  try {
    // Get contract instances
    const rwaToken = await ethers.getContractAt("RWAToken", RWA_TOKEN_ADDRESS);
    const stakingContract = await ethers.getContractAt("MultiPoolStaking", STAKING_ADDRESS);
    
    console.log("✅ Contract instances created successfully");
    
    // Test RWA Token
    console.log("\n=== 🪙 RWA Token Tests ===");
    
    const tokenName = await rwaToken.name();
    const tokenSymbol = await rwaToken.symbol();
    const totalSupply = await rwaToken.totalSupply();
    const deployerBalance = await rwaToken.balanceOf(deployer.address);
    const decimals = await rwaToken.decimals();
    
    console.log("✅ Name:", tokenName);
    console.log("✅ Symbol:", tokenSymbol);
    console.log("✅ Decimals:", decimals.toString());
    console.log("✅ Total Supply:", ethers.formatEther(totalSupply));
    console.log("✅ Deployer Balance:", ethers.formatEther(deployerBalance));
    
    // Test transfer functionality
    console.log("\n--- Testing Transfer ---");
    const transferAmount = ethers.parseEther("1000");
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Test address
    
    console.log("Transferring", ethers.formatEther(transferAmount), "RWA to", recipient);
    const transferTx = await rwaToken.transfer(recipient, transferAmount);
    await transferTx.wait();
    
    const recipientBalance = await rwaToken.balanceOf(recipient);
    console.log("✅ Transfer successful! Recipient balance:", ethers.formatEther(recipientBalance));
    
    // Test Staking Contract
    console.log("\n=== 🥩 Staking Contract Tests ===");
    
    const poolCount = await stakingContract.poolCount();
    const emergencyFee = await stakingContract.emergencyWithdrawFee();
    const owner = await stakingContract.owner();
    
    console.log("✅ Pool Count:", poolCount.toString());
    console.log("✅ Emergency Fee:", emergencyFee.toString(), "basis points");
    console.log("✅ Owner:", owner);
    
    if (poolCount > 0) {
      console.log("\n--- Pool 0 Details ---");
      const poolInfo = await stakingContract.getPoolInfo(0);
      console.log("✅ Staking Token:", poolInfo.stakingToken);
      console.log("✅ Max Stake Limit:", ethers.formatEther(poolInfo.maxStakeLimit));
      console.log("✅ Min Stake Amount:", ethers.formatEther(poolInfo.minStakeAmount));
      console.log("✅ Reward Rate:", ethers.formatEther(poolInfo.rewardRate), "per second");
      console.log("✅ Is Active:", poolInfo.isActive);
      console.log("✅ Lock Period:", poolInfo.lockPeriod.toString(), "seconds");
      console.log("✅ Total Staked:", ethers.formatEther(poolInfo.totalStaked));
    }
    
    // Test staking functionality
    console.log("\n--- Testing Staking ---");
    const stakeAmount = ethers.parseEther("500");
    
    console.log("Approving staking contract to spend", ethers.formatEther(stakeAmount), "RWA");
    const approveTx = await rwaToken.approve(STAKING_ADDRESS, stakeAmount);
    await approveTx.wait();
    console.log("✅ Approval successful");
    
    console.log("Staking", ethers.formatEther(stakeAmount), "RWA in pool 0");
    const stakeTx = await stakingContract.stake(0, stakeAmount);
    await stakeTx.wait();
    console.log("✅ Staking successful");
    
    // Check user info
    const userInfo = await stakingContract.getUserInfo(0, deployer.address);
    console.log("✅ User Staked Amount:", ethers.formatEther(userInfo.stakedAmount));
    
    // Check pending rewards (should be minimal initially)
    const pendingRewards = await stakingContract.pendingRewards(0, deployer.address);
    console.log("✅ Pending Rewards:", ethers.formatEther(pendingRewards));
    
    // Test view functions
    console.log("\n--- Testing View Functions ---");
    const poolUtilization = await stakingContract.getPoolUtilization(0);
    console.log("✅ Pool Utilization:", poolUtilization.toString() + "%");
    
    const allPools = await stakingContract.getAllPools();
    console.log("✅ Total Pools Retrieved:", allPools.length);
    
    const userStakedPools = await stakingContract.getUserStakedPools(deployer.address);
    console.log("✅ User Staked Pools:", userStakedPools.map(p => p.toString()));
    
    console.log("\n🎉 All tests passed successfully!");
    console.log("\n=== 📊 Test Summary ===");
    console.log("✅ RWA Token: Functional");
    console.log("✅ Staking Contract: Functional");
    console.log("✅ Token Transfers: Working");
    console.log("✅ Staking Operations: Working");
    console.log("✅ View Functions: Working");
    console.log("✅ Contract Integration: Working");
    
    console.log("\n=== 🔗 Etherscan Links ===");
    console.log("RWA Token:", `https://sepolia.etherscan.io/address/${RWA_TOKEN_ADDRESS}`);
    console.log("Staking Contract:", `https://sepolia.etherscan.io/address/${STAKING_ADDRESS}`);
    console.log("Your Address:", `https://sepolia.etherscan.io/address/${deployer.address}`);
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n🎉 Sepolia deployment test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });