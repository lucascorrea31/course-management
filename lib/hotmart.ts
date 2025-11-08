/**
 * Hotmart API Integration
 * Documentation: https://developers.hotmart.com/docs/
 *
 * Authentication: OAuth 2.0 with client_credentials grant
 * Base URLs:
 * - Production Auth: https://api-sec-vlc.hotmart.com
 * - Production API: https://api-hot-connect.hotmart.com
 * - Sandbox: https://sandbox.hotmart.com
 */

// Determine environment (production or sandbox)
const HOTMART_ENV = process.env.HOTMART_ENV || "production";

// Authentication URL is the SAME for both sandbox and production
const HOTMART_AUTH_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";

// API base URL changes based on environment
const HOTMART_API_BASE_URL = HOTMART_ENV === "sandbox"
  ? "https://sandbox.hotmart.com"
  : "https://api-hot-connect.hotmart.com";

// Token cache to avoid generating new tokens for every request
let cachedToken: { token: string; expiresAt: number } | null = null;

interface HotmartAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface HotmartProduct {
  id: number;
  name: string;
  ucode: string;
  status?: string;
  createdDate?: string;
  updatedDate?: string;
}

interface HotmartProductsResponse {
  items: HotmartProduct[];
  page_info: {
    total_results: number;
    results_per_page: number;
    page: number;
  };
}

/**
 * Get OAuth access token from Hotmart
 */
export async function getHotmartAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    console.log("Using cached token (expires in", Math.floor((cachedToken.expiresAt - now) / 1000), "seconds)");
    return cachedToken.token;
  }

  console.log("Cached token expired or not available, requesting new token...");

  // Option 1: Use the Basic token provided by Hotmart (recommended)
  const basicAuthToken = process.env.HOTMART_BASIC_AUTH;

  // Option 2: Use client_id and client_secret separately
  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;

  // Determine which auth method to use
  let authHeader: string;
  let queryParams: URLSearchParams;

  if (basicAuthToken) {
    // Use the Basic token directly from Hotmart
    console.log("Using HOTMART_BASIC_AUTH token");
    authHeader = basicAuthToken;

    // When using Basic auth, we still need to extract client_id and client_secret for query params
    // The Basic token is base64 encoded "client_id:client_secret"
    const decoded = Buffer.from(basicAuthToken.replace('Basic ', ''), 'base64').toString();
    const [extractedClientId, extractedClientSecret] = decoded.split(':');

    queryParams = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: extractedClientId,
      client_secret: extractedClientSecret,
    });
  } else if (clientId && clientSecret) {
    // Build Basic auth from client_id and client_secret
    console.log("Building Basic auth from HOTMART_CLIENT_ID and HOTMART_CLIENT_SECRET");
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    authHeader = `Basic ${basicAuth}`;

    queryParams = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
  } else {
    throw new Error(
      "Either HOTMART_BASIC_AUTH or both HOTMART_CLIENT_ID and HOTMART_CLIENT_SECRET must be configured"
    );
  }

  try {
    // Build URL with query parameters as per Hotmart documentation
    const url = `${HOTMART_AUTH_URL}?${queryParams.toString()}`;

    console.log("Requesting Hotmart OAuth token...");
    console.log("Environment:", HOTMART_ENV);
    console.log("Auth URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
    });

    console.log("Auth response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Auth error response:", errorText);
      throw new Error(`Hotmart auth failed: ${response.status} - ${errorText}`);
    }

    const data: HotmartAuthResponse = await response.json();
    console.log("Auth response data:", JSON.stringify(data, null, 2));

    if (!data.access_token) {
      throw new Error("No access_token in response");
    }

    // Decode the URL-encoded token
    const decodedToken = decodeURIComponent(data.access_token);

    console.log("Original token length:", data.access_token.length);
    console.log("Decoded token length:", decodedToken.length);
    console.log("Original token preview:", data.access_token.substring(0, 50) + "...");
    console.log("Decoded token preview:", decodedToken.substring(0, 50) + "...");

    // Cache the token (expires_in is in seconds, subtract 60 seconds for safety)
    const expiresInMs = (data.expires_in - 60) * 1000;
    cachedToken = {
      token: decodedToken,
      expiresAt: Date.now() + expiresInMs,
    };

    console.log("Successfully obtained and decoded access token");
    console.log("Token cached, expires in", data.expires_in - 60, "seconds");
    return decodedToken;
  } catch (error) {
    console.error("Error getting Hotmart access token:", error);
    throw error;
  }
}

/**
 * Fetch products from Hotmart API
 */
export async function fetchHotmartProducts(
  accessToken?: string
): Promise<HotmartProduct[]> {
  try {
    // Get token if not provided
    const token = accessToken || await getHotmartAccessToken();

    console.log("Fetching Hotmart products with token:", token.substring(0, 20) + "...");

    // Using v2 endpoint as found in documentation
    const url = `${HOTMART_API_BASE_URL}/product/rest/v2/products`;
    console.log("Environment:", HOTMART_ENV);
    console.log("Request URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(`Failed to fetch products: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log("Response body preview:", responseText.substring(0, 500));

    let data: HotmartProductsResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response was:", responseText);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    return data.items || [];
  } catch (error) {
    console.error("Error fetching Hotmart products:", error);
    throw error;
  }
}

/**
 * Test Hotmart API connection
 */
export async function testHotmartConnection(): Promise<{
  success: boolean;
  message: string;
  productsCount?: number;
}> {
  try {
    const token = await getHotmartAccessToken();
    const products = await fetchHotmartProducts(token);

    return {
      success: true,
      message: "Connected successfully to Hotmart API",
      productsCount: products.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export type { HotmartProduct, HotmartProductsResponse };
