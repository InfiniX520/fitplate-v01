// Model-facing workflow guidance shared by all eight product tools.
// Chinese requests are handled in Chinese throughout — existing/necessary public progress
// notes and tool prefaces included (technical ids, paths and units may stay verbatim).
// This lives in the tool descriptions so it reaches the model with the very first request,
// not only after a late Skill read. It asks for the LANGUAGE of such notes, not for more
// notes — no extra per-call narration is required.
export const USER_FLOW_GUIDANCE = ' 全程使用与请求一致的语言：中文请求从首条公开说明到最终交付都用中文，已有的或必要的公开进度与工具前说明也用中文（技术 ID、路径、单位可保留原文），无需为每次工具调用额外增加说明。'
  + '用户事实与锁定值不得猜测；keep 仅表示保留原值，不代表可改许可，描述可改尺寸须核对明确的 editable/locked 字段。明确许可的坐标/尺寸区间是设计选择：即使 value_mm 为 null 也要在区间内自行选定具体候选值。'
  + '锁定值约束模型在当前已确认版本中的设计，不禁止用户更正表单事实。用户更正后点击“让 AI 检查这些要求”产生新版本，新事实仍可保持锁定；不要为更正事实要求用户开放 editable。editable 是授权模型在当前版本许可区间内选择尺寸，与用户修改事实后重新确认不同。'
  + '只追问真正缺失或冲突的事实。请用户在现有 FitPlate 表单上直接修改并点击“让 AI 检查这些要求”生成新版本；若问题在近似或未解释的尺寸原文，需明确请用户改写或删除对应片段，原样重复提交不能消除歧义。READY_TO_CONFIRM 由用户点击面板“确认条件，开始设计”确认。'
  + '确认附件由面板生成；绝不让用户手写 JSON、hash 或引用偏移。最终回复用完整中文短句说明：状态、主要改动、关键实测对象对/数值/要求、当前版本下载入口与软件几何验证范围。'
