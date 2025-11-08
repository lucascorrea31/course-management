/**
 * Hotmart API Integration
 * Documentation: https://developers.hotmart.com/docs/
 *
 * Authentication: OAuth 2.0 with client_credentials grant
 * Base URLs:
 * - Auth: https://api-sec-vlc.hotmart.com
 * - API: https://developers.hotmart.com
 *
 * Important: Access tokens are returned URL-encoded and must be used as-is
 * Sandbox vs Production: Use the same endpoints, credentials determine the environment
 */

// Authentication URL for both sandbox and production
const HOTMART_AUTH_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";

// API base URL for both sandbox and production
const HOTMART_API_BASE_URL = "https://developers.hotmart.com";

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
        const decoded = Buffer.from(basicAuthToken.replace("Basic ", ""), "base64").toString();
        const [extractedClientId, extractedClientSecret] = decoded.split(":");

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

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Hotmart auth failed:", response.status, errorText);
            throw new Error(`Hotmart auth failed: ${response.status} - ${errorText}`);
        }

        const data: HotmartAuthResponse = await response.json();

        if (!data.access_token) {
            throw new Error("No access_token in response");
        }

        // Cache the token (expires_in is in seconds, subtract 60 seconds for safety)
        const expiresInMs = (data.expires_in - 60) * 1000;
        cachedToken = {
            token: data.access_token,
            expiresAt: Date.now() + expiresInMs,
        };

        return data.access_token;
    } catch (error) {
        console.error("Error getting Hotmart access token:", error);
        throw error;
    }
}

/**
 * Fetch products from Hotmart API
 */
export async function fetchHotmartProducts(accessToken?: string): Promise<HotmartProduct[]> {
    try {
        // Get token if not provided
        const token = accessToken || (await getHotmartAccessToken());

        // Using v1 endpoint (verified to work with manual testing)
        const url = `${HOTMART_API_BASE_URL}/products/api/v1/products`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to fetch Hotmart products:", response.status, errorText);
            throw new Error(`Failed to fetch products: ${response.status} - ${errorText}`);
        }

        const data: HotmartProductsResponse = await response.json();
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
