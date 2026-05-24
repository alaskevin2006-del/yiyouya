const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getCozeConfig = () => {
  const apiToken = process.env.COZE_API_TOKEN?.trim();
  const workflowId = process.env.COZE_WORKFLOW_ID?.trim();
  const apiBaseUrl = trimTrailingSlash(process.env.COZE_API_BASE_URL?.trim() || 'https://api.coze.cn');
  const timeoutMs = Number(process.env.COZE_WORKFLOW_TIMEOUT_MS ?? 25000);

  return {
    apiToken,
    workflowId,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 25000,
    workflowRunUrl: getWorkflowRunUrl(apiBaseUrl),
  };
};

export const getWorkflowRunUrl = (apiBaseUrl: string) => {
  const baseUrl = trimTrailingSlash(apiBaseUrl);
  if (/\/v\d+\/workflows?\/run$/i.test(baseUrl)) return baseUrl;
  if (/\/v\d+$/i.test(baseUrl)) return `${baseUrl}/workflow/run`;
  return `${baseUrl}/v1/workflow/run`;
};
