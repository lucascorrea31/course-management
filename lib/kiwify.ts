/**
 * Cliente para API da Kiwify
 * Documentação: https://docs.kiwify.com.br/api-reference
 */

const KIWIFY_API_BASE = "https://public-api.kiwify.com/v1";
const KIWIFY_OAUTH_ENDPOINT = `${KIWIFY_API_BASE}/oauth/token`;

interface KiwifyConfig {
    accountId: string;
    clientId: string;
    clientSecret: string;
}

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

class KiwifyClient {
    private config: KiwifyConfig;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(config: KiwifyConfig) {
        this.config = config;
    }

    /**
     * Get access token via OAuth 2.0
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid (with 5 minute buffer)
        const now = Date.now();
        if (this.accessToken && this.tokenExpiresAt > now + 300000) {
            return this.accessToken;
        }

        // Request new token
        const params = new URLSearchParams();
        params.append("client_id", this.config.clientId);
        params.append("client_secret", this.config.clientSecret);

        const response = await fetch(KIWIFY_OAUTH_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Kiwify OAuth Error: ${response.status} - ${error.message || "Authentication failed"}`);
        }

        const tokenData: TokenResponse = await response.json();

        this.accessToken = tokenData.access_token;
        this.tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;

        return this.accessToken;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${KIWIFY_API_BASE}${endpoint}`;
        const token = await this.getAccessToken();

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "x-kiwify-account-id": this.config.accountId,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Kiwify API Error: ${response.status} - ${error || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Lista todos os produtos
     */
    async getProducts() {
        return this.request<{
            products: Array<{
                id: string;
                name: string;
                status: string;
                price: number;
                description?: string;
                image_url?: string;
                created_at: string;
            }>;
        }>("/products");
    }

    /**
     * Busca detalhes de um produto específico
     */
    async getProduct(productId: string) {
        return this.request<{
            id: string;
            name: string;
            status: string;
            price: number;
            description?: string;
            image_url?: string;
            created_at: string;
        }>(`/products/${productId}`);
    }

    /**
     * Lista vendas com filtros opcionais
     */
    async getSales(params?: {
        start_date?: string; // YYYY-MM-DD
        end_date?: string; // YYYY-MM-DD
        status?: "paid" | "refused" | "refunded" | "chargeback";
        product_id?: string;
        page?: number;
        limit?: number;
    }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    searchParams.append(key, value.toString());
                }
            });
        }

        const endpoint = `/sales${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

        return this.request<{
            data: Array<{
                id: string;
                reference: string;
                type: string;
                product: {
                    id: string;
                    name: string;
                };
                shipping?: {
                    id: string;
                    name: string;
                    price: number;
                };
                customer: {
                    id: string;
                    name: string;
                    email: string;
                    cpf?: string;
                    cnpj?: string;
                    mobile?: string;
                    instagram?: string;
                    country?: string;
                    address?: {
                        street: string;
                        number: string;
                        complement?: string;
                        neighborhood: string;
                        city: string;
                        state: string;
                        zipcode: string;
                    };
                };
                status: string;
                payment_method: string;
                net_amount: number;
                currency: string;
                created_at: string;
                updated_at: string;
            }>;
            pagination: {
                count: number;
                page_number: number;
                page_size: number;
            };
        }>(endpoint);
    }

    /**
     * Busca uma venda específica
     */
    async getSale(saleId: string) {
        return this.request<{
            id: string;
            product_id: string;
            product_name: string;
            customer: {
                name: string;
                email: string;
                phone?: string;
            };
            status: string;
            amount: number;
            commission: number;
            created_at: string;
            approved_at?: string;
        }>(`/sales/${saleId}`);
    }

    /**
     * Lista participantes de um evento/produto
     */
    async getEventParticipants(
        productId: string,
        params?: {
            checked_in?: boolean;
            phone?: string;
            cpf?: string;
            external_id?: string;
            order_id?: string;
            batch_id?: string;
            created_at_start_date?: string;
            created_at_end_date?: string;
            updated_at_start_date?: string;
            updated_at_end_date?: string;
            page_size?: number;
            page_number?: number;
        }
    ) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    searchParams.append(key, value.toString());
                }
            });
        }

        const endpoint = `/events/${productId}/participants${
            searchParams.toString() ? `?${searchParams.toString()}` : ""
        }`;

        return this.request<{
            count: number;
            page_number: number;
            page_size: number;
            data: {
                max_tickets: number;
                available: number;
                issued_tickets: number;
                sold_tickets: number;
                total_checkin: number;
                participants: Array<{
                    id: string;
                    external_id?: string;
                    batch_id?: string;
                    batch_name?: string;
                    name: string;
                    email: string;
                    cpf?: string;
                    phone?: string;
                    order_id: string;
                    checkin_at?: string;
                    created_at: string;
                    updated_at: string;
                }>;
            };
        }>(endpoint);
    }
}

// Singleton instance
let kiwifyClient: KiwifyClient | null = null;

export function getKiwifyClient(): KiwifyClient {
    if (!kiwifyClient) {
        const accountId = process.env.KIWIFY_ACCOUNT_ID;
        const clientId = process.env.KIWIFY_CLIENT_ID;
        const clientSecret = process.env.KIWIFY_CLIENT_SECRET;

        if (!accountId || !clientId || !clientSecret) {
            throw new Error(
                "KIWIFY_ACCOUNT_ID, KIWIFY_CLIENT_ID and KIWIFY_CLIENT_SECRET must be defined in .env.local"
            );
        }

        kiwifyClient = new KiwifyClient({ accountId, clientId, clientSecret });
    }

    return kiwifyClient;
}

export default KiwifyClient;
