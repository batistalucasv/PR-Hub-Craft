async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status}`);
  }
  return data;
}

export function fetchPrs(refresh = false) {
  return request(`/api/prs?refresh=${refresh ? 'true' : 'false'}`);
}

const prDetailsCache = new Map();

export async function fetchPrDetails(owner, repo, number, force = false) {
  const cacheKey = `${owner}/${repo}#${number}`;
  if (!force && prDetailsCache.has(cacheKey)) {
    return prDetailsCache.get(cacheKey);
  }
  const data = await request(
    `/api/prs/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}/details`
  );
  if (data) {
    prDetailsCache.set(cacheKey, data);
  }
  return data;
}

export function getCachedPrDetails(owner, repo, number) {
  const cacheKey = `${owner}/${repo}#${number}`;
  return prDetailsCache.get(cacheKey) || null;
}

export function patchPrState(prKey, patch) {
  return request(`/api/prs/${encodeURIComponent(prKey)}/state`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function batchPatchPrs(prKeys, patch) {
  return request('/api/prs/batch', {
    method: 'POST',
    body: JSON.stringify({ prKeys, patch }),
  });
}

export function saveTag(tag) {
  return request('/api/tags', {
    method: 'POST',
    body: JSON.stringify(tag),
  });
}

export function deleteTag(tagId) {
  return request(`/api/tags/${encodeURIComponent(tagId)}`, {
    method: 'DELETE',
  });
}

export function runPrGhAction(owner, repo, number, action, payload = {}) {
  return request(
    `/api/prs/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}/action`,
    {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    }
  );
}

export function executePrRebase(owner, repo, number, action = 'rebase', payload = {}) {
  return request(
    `/api/prs/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}/rebase`,
    {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    }
  );
}
