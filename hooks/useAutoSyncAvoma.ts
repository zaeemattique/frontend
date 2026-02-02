import { useState, useEffect, useCallback } from 'react';
import {
  useGetAvomaMeetingsQuery,
  useSyncAvomaMeetingsMutation,
  useGetParsedMeetingNotesQuery,
} from '@/store/services/api';

interface UseAutoSyncAvomaOptions {
  dealId: string;
  companyId: string | undefined;
  skip?: boolean;
  /** Whether to fetch parsed notes for the first meeting with notes */
  fetchNotes?: boolean;
}

interface UseAutoSyncAvomaResult {
  // Meetings data
  meetingsData: any;
  meetingsLoading: boolean;
  meetingsList: any[];
  meetingWithNotes: any;
  firstMeetingId: string;
  lastSyncTime: string | undefined;

  // Sync state
  isSyncing: boolean;
  hasAutoSynced: boolean;
  syncMeetings: () => Promise<void>;
  refetchMeetings: () => void;

  // Parsed notes data
  parsedNotesData: any;
  notesLoading: boolean;
  notesError: any;
}

/**
 * Hook to manage Avoma meetings data with auto-sync capability.
 * Automatically syncs meetings if none exist on initial load.
 * Optionally fetches parsed notes for the first meeting with notes.
 */
export function useAutoSyncAvoma({
  dealId,
  companyId,
  skip = false,
  fetchNotes = false,
}: UseAutoSyncAvomaOptions): UseAutoSyncAvomaResult {
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  // Fetch meetings data
  const {
    data: meetingsData,
    isLoading: meetingsLoading,
    refetch: refetchMeetings,
  } = useGetAvomaMeetingsQuery(
    { dealId, companyId: companyId || '' },
    { skip: skip || !companyId }
  );

  // Sync mutation
  const [syncAvomaMeetings, { isLoading: isSyncing }] = useSyncAvomaMeetingsMutation();

  // Extract meetings list
  const meetingsList = (meetingsData?.meetings as any[]) || [];

  // Find the most recent meeting that has notes
  const meetingWithNotes = meetingsList.find((m) => m.has_notes);
  const firstMeetingId = meetingWithNotes?.meeting_id || meetingsList[0]?.meeting_id || '';

  // Get last sync time from selection data
  const lastSyncTime = (meetingsData as any)?.selection?.last_updated;

  // Fetch parsed meeting notes for the first meeting with notes
  const {
    data: parsedNotesData,
    isLoading: notesLoading,
    error: notesError,
  } = useGetParsedMeetingNotesQuery(
    { dealId, companyId: companyId || '', meetingId: firstMeetingId },
    { skip: !fetchNotes || !companyId || !firstMeetingId }
  );

  // Manual sync function
  const syncMeetings = useCallback(async () => {
    if (!companyId) return;
    try {
      await syncAvomaMeetings({ dealId, companyId }).unwrap();
      refetchMeetings();
    } catch (error) {
      console.error('Failed to sync Avoma meetings:', error);
    }
  }, [companyId, dealId, syncAvomaMeetings, refetchMeetings]);

  // Auto-sync on initial load if no meetings exist
  useEffect(() => {
    const autoSync = async () => {
      if (
        companyId &&
        !meetingsLoading &&
        meetingsData &&
        meetingsList.length === 0 &&
        !hasAutoSynced &&
        !isSyncing
      ) {
        setHasAutoSynced(true);
        try {
          await syncAvomaMeetings({ dealId, companyId }).unwrap();
          refetchMeetings();
        } catch (error) {
          console.error('Auto-sync Avoma meetings failed:', error);
        }
      }
    };
    autoSync();
  }, [
    companyId,
    meetingsLoading,
    meetingsData,
    meetingsList.length,
    hasAutoSynced,
    isSyncing,
    dealId,
    syncAvomaMeetings,
    refetchMeetings,
  ]);

  return {
    // Meetings data
    meetingsData,
    meetingsLoading,
    meetingsList,
    meetingWithNotes,
    firstMeetingId,
    lastSyncTime,

    // Sync state
    isSyncing,
    hasAutoSynced,
    syncMeetings,
    refetchMeetings,

    // Parsed notes data
    parsedNotesData,
    notesLoading,
    notesError,
  };
}
