export async function apiClient(endpoint: string, options?: RequestInit) {
  const res = await fetch(endpoint, options);
  
  if (!res.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || res.statusText;
    } catch (e) {
      errorMessage = res.statusText;
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return null;
  }

  // Only parse JSON if content-length exists and > 0, or chunked
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}
