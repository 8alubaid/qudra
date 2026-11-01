// Explain the existing approval gates without treating unchecked comparisons as stock shortages.
export function approvalBlocker({row, plan, draftPlan, hasEligibleOptions=false,
  analysisLoading=false, inventoryLoading=false, inventoryError=false,
  reviewConfirmed=false, partialConfirmed=false}) {
  if(row?.status !== 'pending') return 'request_not_pending';
  if(analysisLoading) return 'analysis_pending';
  if(!row.analysis) return 'analysis_required';
  if(row.analysis.missingInformation?.length) return 'missing_information';
  if(inventoryLoading) return 'inventory_comparison_pending';
  if(inventoryError) return 'inventory_comparison_failed';
  if(plan?.blocked) return plan.blocked;
  if(!draftPlan?.total) return hasEligibleOptions ? 'device_selection_required' : 'no_eligible_devices';
  if(!plan?.total) return 'no_eligible_devices';
  if(plan.remaining && !partialConfirmed) return 'partial_confirmation_required';
  if(!reviewConfirmed) return 'inspection_confirmation_required';
  return null;
}
