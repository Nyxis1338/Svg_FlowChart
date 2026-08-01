/**
 * 简易uuid v4 实现，无第三方依赖
 * 仅用于项目内部节点/连线/锚点唯一标识，满足流程图需求
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16 | 0;
    const val = char === 'x' ? rand : (rand & 0x3 | 0x8);
    return val.toString(16);
  });
}

/**
 * 极简短ID（可选，如果你想要更短id，可选用）
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 12);
}