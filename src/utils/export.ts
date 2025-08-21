import type { ProcessedStake } from '@/types/staking';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeRawData?: boolean;
  filename?: string;
}

export const exportStakesData = (
  stakes: ProcessedStake[],
  options: ExportOptions = { format: 'csv' }
) => {
  const { format, includeRawData = false, filename } = options;
  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = `stakes-export-${timestamp}`;

  if (format === 'csv') {
    exportToCSV(stakes, includeRawData, filename || defaultFilename);
  } else {
    exportToJSON(stakes, includeRawData, filename || defaultFilename);
  }
};

const exportToCSV = (stakes: ProcessedStake[], includeRawData: boolean, filename: string) => {
  const headers = [
    'Pool ID',
    'Asset',
    'Staked Amount',
    'Pending Rewards',
    'APY (%)',
    'Start Date',
    'Unlock Date',
    'Status',
    'Lock Period (days)',
    'Time Remaining (seconds)',
    'Total Claimed',
    'Is Locked',
  ];

  if (includeRawData) {
    headers.push('Raw Staked Amount', 'Raw Pending Rewards', 'Raw Last Stake Time', 'Raw Lock Period');
  }

  const csvContent = [
    headers.join(','),
    ...stakes.map(stake => {
      const row = [
        stake.poolId,
        stake.asset,
        stake.stakedAmount,
        stake.pendingRewards,
        stake.apy.toFixed(4),
        stake.startDate.toISOString().split('T')[0],
        stake.unlockDate.toISOString().split('T')[0],
        stake.status,
        Math.floor(stake.lockPeriod / 86400), // Convert to days
        stake.timeRemaining,
        stake.totalClaimed,
        stake.isLocked,
      ];

      if (includeRawData) {
        row.push(
          stake.rawStakedAmount.toString(),
          stake.rawPendingRewards.toString(),
          stake.rawLastStakeTime.toString(),
          stake.rawLockPeriod.toString()
        );
      }

      return row.map(value => {
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    })
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
};

const exportToJSON = (stakes: ProcessedStake[], includeRawData: boolean, filename: string) => {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalStakes: stakes.length,
    totalStakedAmount: stakes.reduce((sum, stake) => sum + stake.stakedAmount, 0),
    totalPendingRewards: stakes.reduce((sum, stake) => sum + stake.pendingRewards, 0),
    stakes: stakes.map(stake => {
      const stakeData: any = {
        poolId: stake.poolId,
        asset: stake.asset,
        stakedAmount: stake.stakedAmount,
        pendingRewards: stake.pendingRewards,
        apy: stake.apy,
        startDate: stake.startDate.toISOString(),
        unlockDate: stake.unlockDate.toISOString(),
        status: stake.status,
        lockPeriod: stake.lockPeriod,
        timeRemaining: stake.timeRemaining,
        totalClaimed: stake.totalClaimed,
        isLocked: stake.isLocked,
      };

      if (includeRawData) {
        stakeData.rawData = {
          stakedAmount: stake.rawStakedAmount.toString(),
          pendingRewards: stake.rawPendingRewards.toString(),
          lastStakeTime: stake.rawLastStakeTime.toString(),
          lockPeriod: stake.rawLockPeriod.toString(),
        };
      }

      return stakeData;
    }),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

// Utility function to format stakes data for display
export const formatStakeForDisplay = (stake: ProcessedStake) => {
  return {
    'Pool ID': `#${stake.poolId}`,
    'Asset': stake.asset,
    'Staked Amount': `${stake.stakedAmount.toLocaleString()} ${stake.asset}`,
    'Pending Rewards': `${stake.pendingRewards.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })} ${stake.asset}`,
    'APY': `${stake.apy.toFixed(2)}%`,
    'Status': stake.isLocked ? 'Locked' : 'Unlocked',
    'Unlock Date': stake.unlockDate.toLocaleDateString(),
    'Time Remaining': stake.isLocked ? formatDuration(stake.timeRemaining) : 'Unlocked',
  };
};

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return 'Unlocked';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Generate summary statistics for export
export const generateStakesSummary = (stakes: ProcessedStake[]) => {
  const totalStaked = stakes.reduce((sum, stake) => sum + stake.stakedAmount, 0);
  const totalRewards = stakes.reduce((sum, stake) => sum + stake.pendingRewards, 0);
  const totalClaimed = stakes.reduce((sum, stake) => sum + stake.totalClaimed, 0);
  
  const lockedStakes = stakes.filter(stake => stake.isLocked);
  const unlockedStakes = stakes.filter(stake => !stake.isLocked);
  
  const avgAPY = stakes.length > 0 
    ? stakes.reduce((sum, stake) => sum + stake.apy, 0) / stakes.length 
    : 0;

  return {
    totalStakes: stakes.length,
    totalStakedAmount: totalStaked,
    totalPendingRewards: totalRewards,
    totalClaimedRewards: totalClaimed,
    lockedStakes: lockedStakes.length,
    unlockedStakes: unlockedStakes.length,
    averageAPY: avgAPY,
    highestAPY: stakes.length > 0 ? Math.max(...stakes.map(s => s.apy)) : 0,
    largestStake: stakes.length > 0 ? Math.max(...stakes.map(s => s.stakedAmount)) : 0,
  };
};