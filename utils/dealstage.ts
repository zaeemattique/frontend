/**
 * Deal Stage Mapping Utilities
 *
 * Maps HubSpot dealstage IDs to human-readable labels
 * across multiple pipelines (ProServe, Assessment, FinOps, etc.)
 */

/**
 * Deal stage mapping based on HubSpot pipelines
 * This maps dealstage IDs to their human-readable labels
 */
export const DEALSTAGE_MAPPING: Record<string, string> = {
  // ProServe Pipeline (default)
  '254222995': 'Prospect',
  'appointmentscheduled': 'Qualified',
  '12717221': 'Technical Validation',
  'qualifiedtobuy': 'Business Validation',
  'presentationscheduled': 'Committed',
  'decisionmakerboughtin': 'Launched',
  'closedlost': 'Closed Lost',

  // Assessment Pipeline
  '973153932': 'Prospect',
  '944422754': 'Qualified',
  '944422755': 'Technical Validation',
  '944422756': 'Business Validation',
  '944422757': 'Committed',
  '944422758': 'Launched',
  '944422760': 'Closed Lost',

  // FinOps Pipeline
  '947336060': 'Prospect',
  '947336062': 'Qualified',
  '947336061': 'Technical Validation',
  '947336063': 'Business Validation',
  '947336064': 'Committed',
  '1072179209': 'Launched',
  '947336066': 'Closed Lost',

  // Managed Services Pipeline
  '991798408': 'Prospect',
  '991798410': 'Qualified',
  '991798409': 'Technical Validation',
  '991798411': 'Business Validation',
  '991798412': 'Committed',
  '992053529': 'Launched',
  '991798414': 'Closed Lost',

  // ACE - Need Assignment Pipeline
  '960066315': 'NEW AO - To Be Assigned',
  '960066321': 'Closed Lost',
  '1062952749': 'Duplicates',

  // Partner Opportunities Pipeline
  '996305753': 'Appointment Scheduled',
  '996305754': 'Qualified To Buy',
  '996305755': 'Presentation Scheduled',
  '996305756': 'Decision Maker Bought-In',
  '996305757': 'Contract Sent',
  '996305758': 'Closed Won',
  '996305759': 'Closed Lost',

  // Closed Lost - Follow Up Pipeline
  '1162733091': 'Immediate Follow Up',
  '1162733092': '30 Day Follow Up',
  '1162733093': '90 Day Follow Up',
};

/**
 * Get the human-readable label for a dealstage ID
 * @param dealstageId The HubSpot dealstage ID
 * @returns The human-readable label or the original ID if not found
 */
export function getDealstageLabel(dealstageId: string | undefined): string {
  if (!dealstageId) return 'Unknown';

  return DEALSTAGE_MAPPING[dealstageId] || dealstageId;
}

/**
 * Get the stage category (early, mid, late, won, lost)
 * Useful for styling or filtering deals by stage
 */
export function getDealstageCategory(
  dealstageId: string | undefined
): 'early' | 'mid' | 'late' | 'won' | 'lost' | 'unknown' {
  if (!dealstageId) return 'unknown';

  const label = getDealstageLabel(dealstageId).toLowerCase();

  if (label.includes('lost')) return 'lost';
  if (label.includes('won') || label.includes('launched')) return 'won';
  if (label.includes('prospect') || label.includes('qualified')) return 'early';
  if (label.includes('validation')) return 'mid';
  if (label.includes('committed') || label.includes('contract')) return 'late';

  return 'unknown';
}
