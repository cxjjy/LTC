export type OpportunityEstimateInput = {
  estimatedRevenue?: number | string | null;
  estimatedLaborCost?: number | string | null;
  estimatedOutsourceCost?: number | string | null;
  estimatedProcurementCost?: number | string | null;
  estimatedTravelCost?: number | string | null;
  estimatedOtherCost?: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateOpportunityEstimate(input: OpportunityEstimateInput) {
  const estimatedRevenue = toNumber(input.estimatedRevenue);
  const estimatedLaborCost = toNumber(input.estimatedLaborCost);
  const estimatedOutsourceCost = toNumber(input.estimatedOutsourceCost);
  const estimatedProcurementCost = toNumber(input.estimatedProcurementCost);
  const estimatedTravelCost = toNumber(input.estimatedTravelCost);
  const estimatedOtherCost = toNumber(input.estimatedOtherCost);
  const estimatedTotalCost =
    estimatedLaborCost +
    estimatedOutsourceCost +
    estimatedProcurementCost +
    estimatedTravelCost +
    estimatedOtherCost;
  const estimatedProfit = estimatedRevenue - estimatedTotalCost;
  const estimatedProfitMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;

  let riskLevel: "normal" | "low_margin" | "high_risk" = "normal";
  let riskLabel = "毛利健康";

  if (estimatedProfitMargin < 10) {
    riskLevel = "high_risk";
    riskLabel = "高风险项目";
  } else if (estimatedProfitMargin < 20) {
    riskLevel = "low_margin";
    riskLabel = "毛利偏低";
  }

  return {
    estimatedRevenue,
    estimatedLaborCost,
    estimatedOutsourceCost,
    estimatedProcurementCost,
    estimatedTravelCost,
    estimatedOtherCost,
    estimatedTotalCost,
    estimatedProfit,
    estimatedProfitMargin,
    riskLevel,
    riskLabel
  };
}
