export function unwrapApiResponse(response, fallback = null) {
  if (
    response &&
    typeof response === "object" &&
    "success" in response &&
    "data" in response
  )
    return response.data ?? fallback;
  return response ?? fallback;
}
