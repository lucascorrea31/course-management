/**
 * Cliente para API da Kiwify
 * Documentação: https://developers.kiwify.com.br/
 */

const KIWIFY_API_BASE = "https://public-api.kiwify.com.br/v1";

interface KiwifyConfig {
    apiKey: string;
    account: string;
}

class KiwifyClient {
    private config: KiwifyConfig;

    constructor(config: KiwifyConfig) {
        this.config = config;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${KIWIFY_API_BASE}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "x-kiwify-account": this.config.account,
                "x-kiwify-key": this.config.apiKey,
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
            sales: Array<{
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
            }>;
            pagination: {
                page: number;
                limit: number;
                total: number;
                total_pages: number;
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
     * Lista assinaturas ativas
     */
    async getSubscriptions(params?: {
        product_id?: string;
        status?: "active" | "canceled" | "suspended";
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

        const endpoint = `/subscriptions${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

        return this.request<{
            subscriptions: Array<{
                id: string;
                product_id: string;
                product_name: string;
                customer: {
                    name: string;
                    email: string;
                };
                status: string;
                amount: number;
                next_charge_date: string;
                created_at: string;
            }>;
            pagination: {
                page: number;
                limit: number;
                total: number;
                total_pages: number;
            };
        }>(endpoint);
    }
}

// Singleton instance
let kiwifyClient: KiwifyClient | null = null;

export function getKiwifyClient(): KiwifyClient {
    if (!kiwifyClient) {
        const apiKey = process.env.KIWIFY_API_KEY;
        const account = process.env.KIWIFY_ACCOUNT;

        if (!apiKey || !account) {
            throw new Error("KIWIFY_API_KEY e KIWIFY_ACCOUNT devem estar definidos no .env.local");
        }

        kiwifyClient = new KiwifyClient({ apiKey, account });
    }

    return kiwifyClient;
}

export default KiwifyClient;
