// API call debouncing utility to prevent too many requests
const apiCallCache = new Map();
const pendingRequests = new Map();

export const debouncedApiCall = (url, options = {}, cacheTime = 5000) => {
  const cacheKey = JSON.stringify({ url, ...options });
  
  // Check if we have a cached result that's still fresh
  if (apiCallCache.has(cacheKey)) {
    const { data, timestamp } = apiCallCache.get(cacheKey);
    if (Date.now() - timestamp < cacheTime) {
      return Promise.resolve(data);
    }
  }
  
  // Check if there's already a pending request for this key
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Make the actual API call
  const requestPromise = fetch(url, options)
    .then(response => response.json())
    .then(data => {
      // Cache the result
      apiCallCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
      
      return data;
    })
    .catch(error => {
      // Remove from pending requests on error
      pendingRequests.delete(cacheKey);
      throw error;
    });
  
  // Store the pending request
  pendingRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
};

// Clear cache utility
export const clearApiCache = (urlPattern) => {
  if (urlPattern) {
    for (const key of apiCallCache.keys()) {
      if (key.includes(urlPattern)) {
        apiCallCache.delete(key);
      }
    }
  } else {
    apiCallCache.clear();
  }
};

export default debouncedApiCall;