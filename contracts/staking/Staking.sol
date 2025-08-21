// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MultiPoolStaking
 * @dev A secure staking contract that supports multiple pools with different tokens
 * @author Senior Solidity Developer
 */
contract MultiPoolStaking is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Pool information structure
    struct PoolInfo {
        IERC20 stakingToken;        // Token to be staked
        uint256 totalStaked;        // Total tokens staked in this pool
        uint256 maxStakeLimit;      // Maximum tokens that can be staked in pool
        uint256 minStakeAmount;     // Minimum amount required to stake
        uint256 rewardRate;         // Reward rate per second (tokens per second per token staked)
        uint256 lastUpdateTime;     // Last time rewards were calculated
        uint256 accRewardPerToken;  // Accumulated rewards per token
        bool isActive;              // Pool status
        uint256 lockPeriod;         // Lock period in seconds
        uint256 totalRewardsDistributed; // Total rewards distributed
    }

    // User information structure
    struct UserInfo {
        uint256 stakedAmount;       // Amount of tokens staked by user
        uint256 rewardDebt;         // Reward debt for reward calculation
        uint256 pendingRewards;     // Pending rewards to be claimed
        uint256 lastStakeTime;      // Last time user staked
        uint256 totalRewardsClaimed; // Total rewards claimed by user
    }

    // State variables
    mapping(uint256 => PoolInfo) public pools;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    uint256 public poolCount;
    uint256 public constant PRECISION = 1e18;
    uint256 public emergencyWithdrawFee = 500; // 5% fee for emergency withdraw (basis points)
    uint256 public constant MAX_FEE = 1000; // Maximum 10% fee
    
    // Events
    event PoolAdded(uint256 indexed poolId, address indexed token, uint256 maxStakeLimit, uint256 rewardRate);
    event PoolUpdated(uint256 indexed poolId, uint256 maxStakeLimit, uint256 rewardRate, bool isActive);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed poolId, uint256 amount, uint256 fee);
    event EmergencyWithdrawFeeUpdated(uint256 oldFee, uint256 newFee);

    // Modifiers
    modifier validPool(uint256 _poolId) {
        require(_poolId < poolCount, "Invalid pool ID");
        require(pools[_poolId].isActive, "Pool is not active");
        _;
    }

    modifier poolExists(uint256 _poolId) {
        require(_poolId < poolCount, "Pool does not exist");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add a new staking pool
     * @param _stakingToken Address of the token to be staked
     * @param _maxStakeLimit Maximum amount that can be staked in this pool
     * @param _minStakeAmount Minimum amount required to stake
     * @param _rewardRate Reward rate per second
     * @param _lockPeriod Lock period in seconds
     */
    function addPool(
        address _stakingToken,
        uint256 _maxStakeLimit,
        uint256 _minStakeAmount,
        uint256 _rewardRate,
        uint256 _lockPeriod
    ) external onlyOwner {
        require(_stakingToken != address(0), "Invalid token address");
        require(_maxStakeLimit > 0, "Max stake limit must be greater than 0");
        require(_minStakeAmount > 0, "Min stake amount must be greater than 0");
        require(_minStakeAmount <= _maxStakeLimit, "Min stake amount cannot exceed max limit");

        pools[poolCount] = PoolInfo({
            stakingToken: IERC20(_stakingToken),
            totalStaked: 0,
            maxStakeLimit: _maxStakeLimit,
            minStakeAmount: _minStakeAmount,
            rewardRate: _rewardRate,
            lastUpdateTime: block.timestamp,
            accRewardPerToken: 0,
            isActive: true,
            lockPeriod: _lockPeriod,
            totalRewardsDistributed: 0
        });

        emit PoolAdded(poolCount, _stakingToken, _maxStakeLimit, _rewardRate);
        poolCount++;
    }

    /**
     * @dev Update pool parameters
     */
    function updatePool(
        uint256 _poolId,
        uint256 _maxStakeLimit,
        uint256 _minStakeAmount,
        uint256 _rewardRate,
        uint256 _lockPeriod,
        bool _isActive
    ) external onlyOwner poolExists(_poolId) {
        require(_maxStakeLimit > 0, "Max stake limit must be greater than 0");
        require(_minStakeAmount > 0, "Min stake amount must be greater than 0");
        require(_minStakeAmount <= _maxStakeLimit, "Min stake amount cannot exceed max limit");

        _updatePoolRewards(_poolId);

        PoolInfo storage pool = pools[_poolId];
        pool.maxStakeLimit = _maxStakeLimit;
        pool.minStakeAmount = _minStakeAmount;
        pool.rewardRate = _rewardRate;
        pool.lockPeriod = _lockPeriod;
        pool.isActive = _isActive;

        emit PoolUpdated(_poolId, _maxStakeLimit, _rewardRate, _isActive);
    }

    /**
     * @dev Stake tokens in a specific pool
     */
    function stake(uint256 _poolId, uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        validPool(_poolId) 
    {
        require(_amount > 0, "Cannot stake 0 tokens");
        
        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        require(_amount >= pool.minStakeAmount, "Amount below minimum stake");
        require(pool.totalStaked + _amount <= pool.maxStakeLimit, "Pool stake limit exceeded");

        // Update pool rewards
        _updatePoolRewards(_poolId);

        // Calculate pending rewards before updating user info
        if (user.stakedAmount > 0) {
            uint256 pending = (user.stakedAmount * pool.accRewardPerToken / PRECISION) - user.rewardDebt;
            user.pendingRewards += pending;
        }

        // Transfer tokens from user
        pool.stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update user and pool info
        user.stakedAmount += _amount;
        user.lastStakeTime = block.timestamp;
        user.rewardDebt = user.stakedAmount * pool.accRewardPerToken / PRECISION;
        pool.totalStaked += _amount;

        emit Staked(msg.sender, _poolId, _amount);
    }

    /**
     * @dev Unstake tokens from a specific pool
     */
    function unstake(uint256 _poolId, uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        validPool(_poolId) 
    {
        UserInfo storage user = userInfo[_poolId][msg.sender];
        PoolInfo storage pool = pools[_poolId];

        require(user.stakedAmount >= _amount, "Insufficient staked amount");
        require(_amount > 0, "Cannot unstake 0 tokens");
        require(
            block.timestamp >= user.lastStakeTime + pool.lockPeriod,
            "Tokens are still locked"
        );

        // Update pool rewards
        _updatePoolRewards(_poolId);

        // Calculate pending rewards
        uint256 pending = (user.stakedAmount * pool.accRewardPerToken / PRECISION) - user.rewardDebt;
        user.pendingRewards += pending;

        // Update user and pool info
        user.stakedAmount -= _amount;
        user.rewardDebt = user.stakedAmount * pool.accRewardPerToken / PRECISION;
        pool.totalStaked -= _amount;

        // Transfer tokens back to user
        pool.stakingToken.safeTransfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _poolId, _amount);
    }

    /**
     * @dev Claim rewards from a specific pool
     */
    function claimRewards(uint256 _poolId) 
        external 
        nonReentrant 
        whenNotPaused 
        validPool(_poolId) 
    {
        UserInfo storage user = userInfo[_poolId][msg.sender];
        PoolInfo storage pool = pools[_poolId];

        // Update pool rewards
        _updatePoolRewards(_poolId);

        // Calculate total rewards
        uint256 pending = (user.stakedAmount * pool.accRewardPerToken / PRECISION) - user.rewardDebt;
        uint256 totalRewards = user.pendingRewards + pending;

        require(totalRewards > 0, "No rewards to claim");

        // Update user info
        user.pendingRewards = 0;
        user.rewardDebt = user.stakedAmount * pool.accRewardPerToken / PRECISION;
        user.totalRewardsClaimed += totalRewards;
        pool.totalRewardsDistributed += totalRewards;

        // Transfer rewards (same token as staked)
        pool.stakingToken.safeTransfer(msg.sender, totalRewards);

        emit RewardsClaimed(msg.sender, _poolId, totalRewards);
    }

    /**
     * @dev Emergency unstake with fee (ignores lock period)
     */
    function emergencyUnstake(uint256 _poolId) 
        external 
        nonReentrant 
        whenNotPaused 
        validPool(_poolId) 
    {
        UserInfo storage user = userInfo[_poolId][msg.sender];
        PoolInfo storage pool = pools[_poolId];

        require(user.stakedAmount > 0, "No tokens staked");

        uint256 stakedAmount = user.stakedAmount;
        uint256 fee = (stakedAmount * emergencyWithdrawFee) / 10000;
        uint256 amountAfterFee = stakedAmount - fee;

        // Update pool and user info
        pool.totalStaked -= stakedAmount;
        user.stakedAmount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0; // Forfeit rewards on emergency withdraw

        // Transfer tokens (minus fee) to user
        pool.stakingToken.safeTransfer(msg.sender, amountAfterFee);
        
        // Fee stays in contract for owner to collect
        emit EmergencyWithdraw(msg.sender, _poolId, amountAfterFee, fee);
    }

    /**
     * @dev Update reward variables for a pool
     */
    function _updatePoolRewards(uint256 _poolId) internal {
        PoolInfo storage pool = pools[_poolId];

        if (block.timestamp <= pool.lastUpdateTime || pool.totalStaked == 0) {
            pool.lastUpdateTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
        uint256 reward = timeElapsed * pool.rewardRate * PRECISION / pool.totalStaked;
        
        pool.accRewardPerToken += reward;
        pool.lastUpdateTime = block.timestamp;
    }

    // View functions
    function getPoolInfo(uint256 _poolId) 
        external 
        view 
        poolExists(_poolId) 
        returns (PoolInfo memory) 
    {
        return pools[_poolId];
    }

    function getUserInfo(uint256 _poolId, address _user) 
        external 
        view 
        poolExists(_poolId) 
        returns (UserInfo memory) 
    {
        return userInfo[_poolId][_user];
    }

    function pendingRewards(uint256 _poolId, address _user) 
        external 
        view 
        poolExists(_poolId) 
        returns (uint256) 
    {
        PoolInfo memory pool = pools[_poolId];
        UserInfo memory user = userInfo[_poolId][_user];

        if (user.stakedAmount == 0) {
            return user.pendingRewards;
        }

        uint256 accRewardPerToken = pool.accRewardPerToken;
        if (block.timestamp > pool.lastUpdateTime && pool.totalStaked > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
            uint256 reward = timeElapsed * pool.rewardRate * PRECISION / pool.totalStaked;
            accRewardPerToken += reward;
        }

        uint256 pending = (user.stakedAmount * accRewardPerToken / PRECISION) - user.rewardDebt;
        return user.pendingRewards + pending;
    }

    function getPoolUtilization(uint256 _poolId) 
        external 
        view 
        poolExists(_poolId) 
        returns (uint256) 
    {
        PoolInfo memory pool = pools[_poolId];
        return (pool.totalStaked * 100) / pool.maxStakeLimit;
    }

    function getAllPools() external view returns (PoolInfo[] memory) {
        PoolInfo[] memory allPools = new PoolInfo[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            allPools[i] = pools[i];
        }
        return allPools;
    }

    function getUserStakedPools(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory stakedPools = new uint256[](poolCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < poolCount; i++) {
            if (userInfo[i][_user].stakedAmount > 0) {
                stakedPools[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = stakedPools[i];
        }
        
        return result;
    }

    // Owner functions
    function setEmergencyWithdrawFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Fee too high");
        uint256 oldFee = emergencyWithdrawFee;
        emergencyWithdrawFee = _fee;
        emit EmergencyWithdrawFeeUpdated(oldFee, _fee);
    }

    function collectFees(uint256 _poolId, uint256 _amount) 
        external 
        onlyOwner 
        poolExists(_poolId) 
    {
        PoolInfo storage pool = pools[_poolId];
        require(_amount > 0, "Amount must be greater than 0");
        
        uint256 contractBalance = pool.stakingToken.balanceOf(address(this));
        uint256 stakedAmount = pool.totalStaked;
        require(contractBalance >= stakedAmount + _amount, "Insufficient fee balance");
        
        pool.stakingToken.safeTransfer(owner(), _amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency function - only for critical situations
    function emergencyTokenRecovery(address _token, uint256 _amount) 
        external 
        onlyOwner 
    {
        require(_token != address(0), "Invalid token address");
        
        // Prevent withdrawal of staked tokens unless it's truly an emergency
        for (uint256 i = 0; i < poolCount; i++) {
            if (address(pools[i].stakingToken) == _token) {
                require(_amount <= IERC20(_token).balanceOf(address(this)) - pools[i].totalStaked, 
                    "Cannot withdraw staked tokens");
            }
        }
        
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}