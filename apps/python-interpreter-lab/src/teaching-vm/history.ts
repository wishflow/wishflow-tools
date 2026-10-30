import { MAX_HISTORY_CONTAINER_RECORDS, MAX_HISTORY_SNAPSHOTS } from './resource-limits';
import type { TeachingVmHistory, TeachingVmSnapshot } from './types';

export interface TeachingHistoryRetention {
  containerRecordCount: number;
  truncated: boolean;
}

export function countSnapshotContainerRecords(snapshot: TeachingVmSnapshot): number {
  return snapshot.heap.reduce((total, object) => total + 1 + (
    object.type === 'list' ? object.items.length : object.entries.length
  ), 0);
}

/** Appends a snapshot and applies the single retention policy shared by VM and UI. */
export function appendTeachingHistorySnapshot(
  items: TeachingVmSnapshot[],
  snapshot: TeachingVmSnapshot,
  containerRecordCount: number,
  truncated: boolean,
): TeachingHistoryRetention {
  items.push(snapshot);
  return trimOldestSnapshots(items, containerRecordCount + countSnapshotContainerRecords(snapshot), truncated);
}

/** Bounds a merged worker update before publishing it as immutable UI history. */
export function boundTeachingHistory(
  snapshots: readonly TeachingVmSnapshot[],
  truncated: boolean,
): TeachingVmHistory {
  const items = [...snapshots];
  const retention = trimOldestSnapshots(
    items,
    items.reduce((total, snapshot) => total + countSnapshotContainerRecords(snapshot), 0),
    truncated,
  );
  return Object.freeze({ items: Object.freeze(items), truncated: retention.truncated });
}

function trimOldestSnapshots(
  items: TeachingVmSnapshot[],
  containerRecordCount: number,
  truncated: boolean,
): TeachingHistoryRetention {
  let retainedContainerRecords = containerRecordCount;
  let historyTruncated = truncated;
  while (items.length > 1 && (
    items.length > MAX_HISTORY_SNAPSHOTS
    || retainedContainerRecords > MAX_HISTORY_CONTAINER_RECORDS
  )) {
    const removed = items.shift();
    if (removed) retainedContainerRecords -= countSnapshotContainerRecords(removed);
    historyTruncated = true;
  }
  return { containerRecordCount: retainedContainerRecords, truncated: historyTruncated };
}
