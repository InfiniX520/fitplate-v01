// A method-bearing workspace is a FitPlate product workspace. This marker only
// narrows tool execution; it never grants trust, filesystem access or approval.
// The public Host hook returns a real refusal before execution/approval, so the
// model can recover without a supervisor granting an unrelated capability.
import { lstat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

async function isProductWorkspace(context) {
  const root = context?.session?.workspaceRoot
  if (typeof root !== 'string' || !isAbsolute(root)) return false
  try {
    await lstat(join(root, '.agh', 'skills', 'fitplate-design', 'SKILL.md'))
    return true
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false
    throw error
  }
}

export function registerProductPolicy(agnes, productToolNames) {
  const allowed = new Set([...productToolNames, 'read', 'skill_read', 'ls', 'find', 'grep', 'todo'])
  agnes.registerHook('context', async (_payload, context) => {
    if (!await isProductWorkspace(context)) return {}
    return { sections: [{
      id: 'fitplate/product-workflow', order: 250,
      content: '当前工作区使用 FitPlate 产品流程。请用中文说明必要结果，技术标识可保留原文，无需增加工具旁白。草稿说明简述状态、待处理项和锁定/许可，完整数值可在确认卡核对；复述数值时保留输入字段、单位及坐标系，不补写输入没有的换算或变化。需求和确认来自本会话附件；建模、验证及导出使用 fitplate_* 工具。选点前读取 load_task 的冻结设备和场景几何；未经新候选验证，公开说明只陈述拟改字段和待验证状态，不宣称已远离某对象或增大间距。整改只关联当前报告的限制项。矩形板原点与孔位固定时，增大板宽/板高不能增加左/下孔边材料，也不能增加孔间材料；不要把不影响限制项的字段列为补救。不要申请 shell、通用写入、编辑、代码执行、联网或子智能体来绕过流程。读取只用于本会话附件、通用方法和本工作区的实际输入/反馈；工具拒绝不是几何不可行，应根据真实拒绝原因选择正确工具继续，不能宣称拒绝的操作已执行。',
    }] }
  })
  agnes.registerHook('tool_call', async (payload, context) => {
    if (allowed.has(payload.name) || !await isProductWorkspace(context)) return { allow: true }
    return {
      allow: false,
      reason: 'FITPLATE_PRODUCT_TOOL_REQUIRED：此工作区仅允许 FitPlate 产品工具和必要的只读查询。该操作未执行。请使用 fitplate_get_request、fitplate_load_task、fitplate_build_candidate、fitplate_validate_candidate、fitplate_get_run 或 fitplate_export_package 继续当前流程；不要改用 shell、通用写入或代码执行，也不要把权限拒绝当成几何结论。',
    }
  })
}
