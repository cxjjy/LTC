"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { SearchableSelect } from "@/components/common/SearchableSelect";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  weeklyReportItemTypeLabels,
  weeklyReportPriorityLabels,
  weeklyReportStatusLabels
} from "@/lib/constants";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";
import { cn, formatDateTime } from "@/lib/utils";

type Candidate = {
  id: string;
  label: string;
  keywords?: string[];
  initials?: string;
  pinyin?: string;
};

type ReportItem = {
  id?: string;
  itemType: "done" | "plan" | "risk";
  content: string;
  relatedProjectId?: string | null;
  relatedOpportunityId?: string | null;
  priority: "low" | "medium" | "high";
  needCoordination: boolean;
  expectedFinishAt?: string | null;
  impactNote?: string | null;
  sortOrder?: number;
};

type Suggestion = {
  id: string;
  sectionType: "done" | "plan" | "risk";
  sourceType: string;
  sourceLabel: string;
  reason?: string | null;
  content: string;
  relatedProjectId?: string | null;
  relatedProject?: { id: string; label: string } | null;
  relatedOpportunityId?: string | null;
  relatedOpportunity?: { id: string; label: string } | null;
  confidenceScore: number;
  status: "pending" | "applied" | "ignored";
  priority: "low" | "medium" | "high";
  needCoordination: boolean;
  expectedFinishAt?: string | null;
  impactNote?: string | null;
};

type WorkbenchPayload = {
  report: {
    id: string;
    weekStart: string;
    status: "draft" | "submitted" | "overdue" | "reviewed" | "returned";
    summary?: string | null;
    submittedAt?: Date | string | null;
    lastSavedAt?: Date | string | null;
    returnNote?: string | null;
  };
  items: ReportItem[];
  helper: {
    weeklyProjectCount: number;
    weeklyUpdateCount: number;
    recommendedProjects: Candidate[];
    suggestionCount: number;
    previousUnfinishedPlanCount: number;
    ongoingRiskCount: number;
    generatedSummary: string;
    generationBasis: Array<{ sourceType: string; label: string; count: number }>;
  };
  relatedProjectsCandidates: Candidate[];
  relatedOpportunitiesCandidates: Candidate[];
  suggestions: Suggestion[];
};

type WeeklyReportEditorProps = {
  weekLabel: string;
  currentUserRole: string;
  workbench: WorkbenchPayload;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type SuggestionDraft = {
  content: string;
  relatedProjectId?: string | null;
  priority: "low" | "medium" | "high";
  needCoordination: boolean;
  expectedFinishAt?: string | null;
  impactNote?: string | null;
};

function createEmptyItem(itemType: ReportItem["itemType"], sortOrder: number): ReportItem {
  return {
    itemType,
    content: "",
    relatedProjectId: "",
    relatedOpportunityId: "",
    priority: itemType === "risk" ? "high" : "medium",
    needCoordination: false,
    expectedFinishAt: "",
    impactNote: "",
    sortOrder
  };
}

function normalizeReportItems(items: ReportItem[]) {
  return items
    .filter((item) => item.content.trim())
    .map((item, index) => ({
      ...item,
      sortOrder: index
    }));
}

function createDraftFingerprint(summary: string, items: ReportItem[]) {
  return JSON.stringify({
    summary,
    items: normalizeReportItems(items).map((item) => ({
      id: item.id ?? null,
      itemType: item.itemType,
      content: item.content,
      relatedProjectId: item.relatedProjectId ?? null,
      priority: item.priority,
      needCoordination: item.needCoordination,
      expectedFinishAt: item.expectedFinishAt ?? null,
      impactNote: item.impactNote ?? null,
      sortOrder: item.sortOrder ?? null
    }))
  });
}

function SuggestionCard({
  suggestion,
  projectCandidates,
  isPending,
  onApply,
  onIgnore
}: {
  suggestion: Suggestion;
  projectCandidates: Candidate[];
  isPending: boolean;
  onApply: (suggestionId: string, override?: SuggestionDraft) => void;
  onIgnore: (suggestionId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SuggestionDraft>({
    content: suggestion.content,
    relatedProjectId: suggestion.relatedProjectId,
    priority: suggestion.priority,
    needCoordination: suggestion.needCoordination,
    expectedFinishAt: suggestion.expectedFinishAt,
    impactNote: suggestion.impactNote
  });

  useEffect(() => {
    setDraft({
      content: suggestion.content,
      relatedProjectId: suggestion.relatedProjectId,
      priority: suggestion.priority,
      needCoordination: suggestion.needCoordination,
      expectedFinishAt: suggestion.expectedFinishAt,
      impactNote: suggestion.impactNote
    });
    setEditing(false);
  }, [suggestion]);

  return (
    <div className="rounded-[12px] border border-border bg-[rgba(248,250,252,0.9)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(59,130,246,0.10)] px-2.5 py-1 text-xs font-medium text-[rgb(29,78,216)]">
              {suggestion.sourceLabel}
            </span>
            <span className="rounded-full bg-[rgba(15,23,42,0.06)] px-2.5 py-1 text-xs text-muted-foreground">
              置信度 {Math.round(suggestion.confidenceScore * 100)}%
            </span>
          </div>
          <div className="text-sm font-medium text-foreground">{suggestion.content}</div>
          {suggestion.reason ? <div className="text-xs text-muted-foreground">{suggestion.reason}</div> : null}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {suggestion.relatedProject?.label ? <span>关联项目：{suggestion.relatedProject.label}</span> : null}
            {suggestion.relatedOpportunity?.label ? (
              <span>关联商机：{suggestion.relatedOpportunity.label}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isPending} onClick={() => onApply(suggestion.id)}>
            采用
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => setEditing((v) => !v)}>
            编辑后采用
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => onIgnore(suggestion.id)}>
            忽略
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 grid gap-3 rounded-[12px] border border-border bg-white p-4">
          <Textarea
            value={draft.content}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
            placeholder="编辑后再采用"
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SearchableSelect
              value={draft.priority}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  priority: value as SuggestionDraft["priority"]
                }))
              }
              options={Object.entries(weeklyReportPriorityLabels).map(([value, label]) => ({
                value,
                label: `优先级：${label}`
              }))}
              placeholder="选择优先级"
              searchPlaceholder="搜索优先级"
              clearable={false}
            />
            <SearchableSelect
              value={draft.relatedProjectId ?? ""}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  relatedProjectId: value
                }))
              }
              options={projectCandidates.map((candidate) => ({
                value: candidate.id,
                label: candidate.label,
                keywords: candidate.keywords,
                initials: candidate.initials,
                pinyin: candidate.pinyin
              }))}
              requestUrl="/api/options/projects"
              placeholder="关联项目（可选）"
              searchPlaceholder="搜索项目编号或名称"
            />
            {suggestion.sectionType === "plan" ? (
              <Input
                type="date"
                value={draft.expectedFinishAt ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    expectedFinishAt: event.target.value
                  }))
                }
              />
            ) : (
              <div />
            )}
            <label className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.needCoordination}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    needCoordination: event.target.checked
                  }))
                }
              />
              需要协同
            </label>
          </div>
          {suggestion.sectionType === "risk" ? (
            <Textarea
              value={draft.impactNote ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  impactNote: event.target.value
                }))
              }
              placeholder="风险说明"
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              取消
            </Button>
            <Button type="button" onClick={() => onApply(suggestion.id, draft)} disabled={isPending}>
              保存后采用
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WeeklyReportEditor({ weekLabel, currentUserRole, workbench }: WeeklyReportEditorProps) {
  const toast = useToast();
  const [summary, setSummary] = useState(workbench.report.summary ?? "");
  const [report, setReport] = useState(workbench.report);
  const [draftItems, setDraftItems] = useState<ReportItem[]>(workbench.items);
  const [helper, setHelper] = useState(workbench.helper);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(workbench.suggestions);
  const [showBasis, setShowBasis] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(workbench.report.lastSavedAt ? "saved" : "idle");
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    createDraftFingerprint(workbench.report.summary ?? "", workbench.items)
  );
  const [isPending, startTransition] = useTransition();
  const isReadOnly = ["submitted", "reviewed"].includes(report.status);
  const canApplyAll = currentUserRole !== "PROJECT_MANAGER";
  const draftFingerprint = useMemo(() => createDraftFingerprint(summary, draftItems), [summary, draftItems]);
  const groupedItems = useMemo(
    () => ({
      done: draftItems.filter((item) => item.itemType === "done"),
      plan: draftItems.filter((item) => item.itemType === "plan"),
      risk: draftItems.filter((item) => item.itemType === "risk")
    }),
    [draftItems]
  );
  const groupedSuggestions = useMemo(
    () => ({
      done: suggestions.filter((item) => item.sectionType === "done" && item.status === "pending"),
      plan: suggestions.filter((item) => item.sectionType === "plan" && item.status === "pending"),
      risk: suggestions.filter((item) => item.sectionType === "risk" && item.status === "pending")
    }),
    [suggestions]
  );

  useEffect(() => {
    if (saveStatus === "saving") {
      return;
    }

    if (draftFingerprint === savedFingerprint) {
      setSaveStatus(report.lastSavedAt ? "saved" : "idle");
      return;
    }

    setSaveStatus("idle");
  }, [draftFingerprint, report.lastSavedAt, saveStatus, savedFingerprint]);

  const saveStatusMeta = useMemo(() => {
    switch (saveStatus) {
      case "saving":
        return {
          label: "保存中",
          description: "正在保存本页修改，请稍候",
          className: "border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] text-[rgb(29,78,216)]"
        };
      case "saved":
        return {
          label: "已保存",
          description: report.lastSavedAt ? `最近保存于 ${formatDateTime(report.lastSavedAt)}` : "草稿内容已保存",
          className: "border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)] text-[rgb(21,128,61)]"
        };
      case "error":
        return {
          label: "保存失败",
          description: "最近一次保存未成功，请重试",
          className: "border-[rgba(239,68,68,0.24)] bg-[rgba(239,68,68,0.08)] text-[rgb(185,28,28)]"
        };
      default:
        return {
          label: "未保存",
          description: "当前有未保存修改",
          className: "border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] text-[rgb(146,64,14)]"
        };
    }
  }, [report.lastSavedAt, saveStatus]);

  function syncWorkbench(nextWorkbench: WorkbenchPayload) {
    setReport(nextWorkbench.report);
    setDraftItems(nextWorkbench.items);
    setHelper(nextWorkbench.helper);
    setSuggestions(nextWorkbench.suggestions);
    setSavedFingerprint(createDraftFingerprint(nextWorkbench.report.summary ?? "", nextWorkbench.items));
    setSaveStatus(nextWorkbench.report.lastSavedAt ? "saved" : "idle");
    if (!summary.trim() && nextWorkbench.helper.generatedSummary) {
      setSummary(nextWorkbench.helper.generatedSummary);
    }
  }

  function updateItem(index: number, patch: Partial<ReportItem>) {
    setDraftItems((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item))
    );
  }

  function addItem(itemType: ReportItem["itemType"]) {
    setDraftItems((current) => [...current, createEmptyItem(itemType, current.length)]);
  }

  function removeItem(index: number) {
    setDraftItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function saveDraft() {
    setSaveStatus("saving");
    const response = await fetch(`/api/weekly-reports/${report.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        items: normalizeReportItems(draftItems)
      })
    });
    const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<WorkbenchPayload["report"] & { items: ReportItem[] }>;
    if (!response.ok) {
      setSaveStatus("error");
      toast.error("保存失败", getUserFriendlyError(payload, "周报保存失败，请稍后重试"));
      return false;
    }
    const data = (payload as ApiSuccessPayload<any>).data;
    setReport((current) => ({ ...current, ...data }));
    setDraftItems(data.items);
    setSavedFingerprint(createDraftFingerprint(data.summary ?? "", data.items));
    setSaveStatus("saved");
    toast.success("保存成功", "草稿已保存，可继续编辑");
    return true;
  }

  function runAction(task: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await task();
      } catch {
        toast.error("操作失败", "网络异常，请稍后重试");
      }
    });
  }

  async function generateDraft() {
    const response = await fetch("/api/weekly-reports/current/suggestions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: report.weekStart })
    });
    const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<WorkbenchPayload>;
    if (!response.ok) {
      toast.error("生成失败", getUserFriendlyError(payload, "草稿推荐生成失败，请稍后重试"));
      return;
    }
    syncWorkbench((payload as ApiSuccessPayload<WorkbenchPayload>).data as WorkbenchPayload);
    toast.success("生成成功", "系统推荐草稿已刷新");
  }

  async function applyAllSuggestions() {
    const response = await fetch("/api/weekly-reports/current/suggestions/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: report.weekStart, applyAll: true })
    });
    const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<WorkbenchPayload>;
    if (!response.ok) {
      toast.error("采用失败", getUserFriendlyError(payload, "推荐条目采用失败"));
      return;
    }
    syncWorkbench((payload as ApiSuccessPayload<WorkbenchPayload>).data as WorkbenchPayload);
    toast.success("采用成功", "已应用全部推荐");
  }

  async function applySuggestion(suggestionId: string, override?: SuggestionDraft) {
    const response = await fetch("/api/weekly-reports/current/suggestions/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        week: report.weekStart,
        suggestionIds: [suggestionId],
        overrides: override ? [{ id: suggestionId, ...override }] : undefined
      })
    });
    const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<WorkbenchPayload>;
    if (!response.ok) {
      toast.error("采用失败", getUserFriendlyError(payload, "推荐条目采用失败"));
      return;
    }
    syncWorkbench((payload as ApiSuccessPayload<WorkbenchPayload>).data as WorkbenchPayload);
    toast.success("采用成功", "推荐条目已加入周报内容");
  }

  async function ignoreSuggestion(suggestionId: string) {
    const response = await fetch("/api/weekly-reports/current/suggestions/ignore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        week: report.weekStart,
        suggestionIds: [suggestionId]
      })
    });
    const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<WorkbenchPayload>;
    if (!response.ok) {
      toast.error("忽略失败", getUserFriendlyError(payload, "推荐条目忽略失败"));
      return;
    }
    syncWorkbench((payload as ApiSuccessPayload<WorkbenchPayload>).data as WorkbenchPayload);
    toast.success("已忽略", "推荐条目已移出待处理区");
  }

  async function submitReport() {
    const saved = await saveDraft();
    if (!saved) {
      return;
    }
    const response = await fetch(`/api/weekly-reports/${report.id}/submit`, {
      method: "POST"
    });
    const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<any>;
    if (!response.ok) {
      toast.error("提交失败", getUserFriendlyError(payload, "周报提交失败，请稍后重试"));
      return;
    }
    setReport((payload as ApiSuccessPayload<any>).data);
    toast.success("提交成功", "本周周报已提交");
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="自动生成草稿工作台"
        description="系统先给出推荐内容，你只需要确认、少量补充并保存。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(59,130,246,0.10)] px-3 py-1 text-sm font-medium text-[rgb(29,78,216)]">
              {weeklyReportStatusLabels[report.status]}
            </span>
            <Button type="button" variant="outline" disabled={isPending || isReadOnly} onClick={() => runAction(generateDraft)}>
              生成草稿
            </Button>
            {canApplyAll ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isReadOnly || !helper.suggestionCount}
                onClick={() => runAction(applyAllSuggestions)}
              >
                应用全部推荐
              </Button>
            ) : null}
            <Button type="button" disabled={isPending || isReadOnly} onClick={() => runAction(saveDraft)}>
              {saveStatus === "saving" ? "保存中..." : "保存草稿"}
            </Button>
            <Button type="button" disabled={isPending || isReadOnly} onClick={() => runAction(submitReport)}>
              提交周报
            </Button>
          </div>
        }
      >
        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
          <div>当前状态：{weeklyReportStatusLabels[report.status]}</div>
          <div>最近保存：{report.lastSavedAt ? formatDateTime(report.lastSavedAt) : "尚未保存"}</div>
          <div>系统推荐：{helper.suggestionCount} 条</div>
          <div>上周未完成计划：{helper.previousUnfinishedPlanCount} 条</div>
        </div>
      </SectionCard>

      <SectionCard title="周报概览" description={`周期：${weekLabel}`}>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">当前周期：{weekLabel}</div>
            <label className="text-sm font-medium text-foreground">补充摘要</label>
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="系统可先生成摘要推荐，你也可以继续补充关键结论"
              disabled={isReadOnly || isPending}
            />
            {report.returnNote ? (
              <div className="rounded-[12px] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[rgb(146,64,14)]">
                退回说明：{report.returnNote}
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 rounded-[12px] border border-border p-4 text-sm text-muted-foreground">
            <div className={cn("rounded-[10px] border px-3 py-3", saveStatusMeta.className)}>
              <div className="text-sm font-medium">{saveStatusMeta.label}</div>
              <div className="mt-1 text-xs opacity-90">{saveStatusMeta.description}</div>
            </div>
            <div>本周系统生成推荐条目数：{helper.suggestionCount}</div>
            <div>上周未完成计划数：{helper.previousUnfinishedPlanCount}</div>
            <div>持续风险数：{helper.ongoingRiskCount}</div>
            <div>本周参与项目数：{helper.weeklyProjectCount}</div>
            <div>本周更新记录数：{helper.weeklyUpdateCount}</div>
            <button
              type="button"
              className="w-fit text-sm font-medium text-[rgb(29,78,216)]"
              onClick={() => setShowBasis((current) => !current)}
            >
              {showBasis ? "收起生成依据" : "查看生成依据"}
            </button>
            {showBasis ? (
              <div className="rounded-[12px] border border-dashed border-border bg-[rgba(248,250,252,0.8)] p-3">
                <div className="text-sm font-medium text-foreground">推荐项目</div>
                <div className="mt-2 space-y-1">
                  {helper.recommendedProjects.map((project) => (
                    <div key={project.id}>- {project.label}</div>
                  ))}
                </div>
                <div className="mt-3 text-sm font-medium text-foreground">来源统计</div>
                <div className="mt-2 space-y-1">
                  {helper.generationBasis.map((basis) => (
                    <div key={basis.sourceType}>
                      {basis.label}：{basis.count} 条
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {(["done", "plan", "risk"] as const).map((sectionType) => (
        <SectionCard
          key={sectionType}
          title={weeklyReportItemTypeLabels[sectionType]}
          description={`推荐 ${groupedSuggestions[sectionType].length} 条，已采用 ${groupedItems[sectionType].length} 条`}
          actions={
            !isReadOnly ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => addItem(sectionType)}>
                新增条目
              </Button>
            ) : null
          }
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">系统推荐区</div>
              {groupedSuggestions[sectionType].length ? (
                <div className="grid gap-3">
                  {groupedSuggestions[sectionType].map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      projectCandidates={workbench.relatedProjectsCandidates}
                      isPending={isPending || isReadOnly}
                      onApply={(id, override) => runAction(() => applySuggestion(id, override))}
                      onIgnore={(id) => runAction(() => ignoreSuggestion(id))}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  当前无待处理推荐
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">已采用条目区</div>
              {groupedItems[sectionType].length ? (
                <div className="space-y-4">
                  {groupedItems[sectionType].map((item) => {
                    const index = draftItems.indexOf(item);
                    return (
                      <div key={`${sectionType}-${index}`} className="grid gap-3 rounded-[12px] border border-border p-4">
                        <Textarea
                          value={item.content}
                          onChange={(event) => updateItem(index, { content: event.target.value })}
                          placeholder={`填写${weeklyReportItemTypeLabels[sectionType]}`}
                          disabled={isReadOnly || isPending}
                        />
                        <div className={cn("grid gap-3 md:grid-cols-2", sectionType === "plan" ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
                          <SearchableSelect
                            value={item.priority}
                            onValueChange={(value) =>
                              updateItem(index, { priority: value as ReportItem["priority"] })
                            }
                            disabled={isReadOnly || isPending}
                            options={Object.entries(weeklyReportPriorityLabels).map(([value, label]) => ({
                              value,
                              label: `优先级：${label}`
                            }))}
                            placeholder="选择优先级"
                            searchPlaceholder="搜索优先级"
                            clearable={false}
                          />
                          <SearchableSelect
                            value={item.relatedProjectId ?? ""}
                            onValueChange={(value) => updateItem(index, { relatedProjectId: value })}
                            disabled={isReadOnly || isPending}
                            options={workbench.relatedProjectsCandidates.map((candidate) => ({
                              value: candidate.id,
                              label: candidate.label,
                              keywords: candidate.keywords,
                              initials: candidate.initials,
                              pinyin: candidate.pinyin
                            }))}
                            requestUrl="/api/options/projects"
                            placeholder="关联项目（可选）"
                            searchPlaceholder="搜索项目编号或名称"
                          />
                          {sectionType === "plan" ? (
                            <Input
                              type="date"
                              value={item.expectedFinishAt ?? ""}
                              onChange={(event) => updateItem(index, { expectedFinishAt: event.target.value })}
                              disabled={isReadOnly || isPending}
                            />
                          ) : null}
                          <label className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={item.needCoordination}
                              onChange={(event) =>
                                updateItem(index, { needCoordination: event.target.checked })
                              }
                              disabled={isReadOnly || isPending}
                            />
                            需要协同
                          </label>
                        </div>
                        {sectionType === "risk" && item.priority === "high" ? (
                          <Textarea
                            value={item.impactNote ?? ""}
                            onChange={(event) => updateItem(index, { impactNote: event.target.value })}
                            placeholder="高风险必须填写影响说明"
                            disabled={isReadOnly || isPending}
                          />
                        ) : null}
                        {!isReadOnly ? (
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" onClick={() => removeItem(index)} disabled={isPending}>
                              删除条目
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  暂无已采用条目
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
