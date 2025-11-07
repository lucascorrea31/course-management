import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Student from "@/models/Student";
import { addStudentToGroup, removeStudentFromGroup } from "@/lib/telegram";
import { Model } from "mongoose";

interface KiwifyCustomer {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    mobile?: string;
    cpf?: string;
    cnpj?: string;
    instagram?: string;
    country?: string;
    address?: {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zipcode?: string;
    };
}

interface KiwifySaleData {
    id: string;
    reference?: string;
    product: {
        id: string;
        name: string;
    };
    customer: KiwifyCustomer;
    amount?: number;
    net_amount?: number;
    commission?: number;
    payment_method?: string;
    installments?: number;
    approved_at?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Webhook to receive Kiwify events
 *
 * Supported events:
 * - sale.approved: Sale approved
 * - sale.refused: Sale refused
 * - sale.refunded: Sale refunded
 * - sale.chargeback: Chargeback
 *
 * Configure this endpoint in Kiwify:
 * https://your-domain.com/api/kiwify/webhook
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log("Kiwify webhook received:", JSON.stringify(body, null, 2));

        const { event, data } = body;

        if (!event || !data) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        await dbConnect();

        // Process different event types
        switch (event) {
            case "sale.approved":
            case "sale.refused":
            case "sale.refunded":
            case "sale.chargeback":
                await handleSaleEvent(event, data);
                break;

            default:
                console.log(`Unhandled event: ${event}`);
        }

        return NextResponse.json({ success: true, message: "Webhook processed" });
    } catch (error: unknown) {
        console.error("Error processing webhook:", error);
        return NextResponse.json({ error: "Error processing webhook" }, { status: 500 });
    }
}

async function handleSaleEvent(event: string, data: KiwifySaleData) {
    try {
        // Find local product
        const product = await Product.findOne({ kiwifyId: data.product.id });

        // Determine status based on event
        let status: "paid" | "refused" | "refunded" | "chargeback" | "pending" = "pending";
        if (event === "sale.approved") status = "paid";
        else if (event === "sale.refused") status = "refused";
        else if (event === "sale.refunded") status = "refunded";
        else if (event === "sale.chargeback") status = "chargeback";

        // Update or create sale
        await Sale.findOneAndUpdate(
            { kiwifyId: data.id },
            {
                kiwifyId: data.id,
                productId: product?._id,
                productName: data.product.name,
                customer: {
                    name: data.customer.name,
                    email: data.customer.email,
                    phone: data.customer.mobile || data.customer.phone,
                },
                status,
                amount: data.net_amount || data.amount || 0,
                netAmount: data.net_amount,
                commission: data.commission || 0,
                paymentMethod: data.payment_method,
                installments: data.installments,
                userId: product?.userId,
                approvedAt: status === "paid" ? new Date() : undefined,
            },
            { upsert: true, new: true }
        );

        console.log(`Sale ${data.id} processed with status: ${status}`);

        // Handle Telegram group management based on sale status
        const customerEmail = data.customer?.email?.toLowerCase().trim();

        if (!customerEmail) {
            console.warn("No customer email provided, skipping Telegram integration");
            return;
        }

        // Process Telegram actions based on event
        if (event === "sale.approved" && product?.userId) {
            await handleStudentAdded(data, product);
        } else if (event === "sale.refunded" || event === "sale.chargeback") {
            await handleStudentRemoved(customerEmail, event === "sale.refunded" ? "refunded" : "chargeback");
        }
    } catch (error) {
        console.error("Error processing sale event:", error);
        throw error;
    }
}

/**
 * Handle student added (sale approved)
 * Creates/updates student record and generates Telegram invite link
 */
async function handleStudentAdded(
    data: KiwifySaleData,
    product: typeof Product extends Model<infer T> ? T : never
) {
    try {
        const email = data.customer.email.toLowerCase().trim();
        const name = data.customer.name;

        // Find or create student
        let student = await Student.findOne({
            email: email,
            userId: product.userId,
        });

        const studentData = {
            userId: product.userId,
            kiwifyCustomerId: data.customer.id,
            name,
            email,
            phone: data.customer.mobile || data.customer.phone,
            cpf: data.customer.cpf,
            cnpj: data.customer.cnpj,
            instagram: data.customer.instagram,
            country: data.customer.country,
            address: data.customer.address
                ? {
                      street: data.customer.address.street,
                      number: data.customer.address.number,
                      complement: data.customer.address.complement,
                      neighborhood: data.customer.address.neighborhood,
                      city: data.customer.address.city,
                      state: data.customer.address.state,
                      zipcode: data.customer.address.zipcode,
                  }
                : undefined,
            isActive: true,
            lastSyncAt: new Date(),
        };

        const productEnrollment = {
            productId: product._id as any,
            productName: product.name,
            enrolledAt: new Date(data.created_at || Date.now()),
            status: "active" as const,
            saleId: data.id,
            saleReference: data.reference,
            paymentMethod: data.payment_method,
            amount: data.net_amount,
        };

        if (student) {
            // Update existing student - add product if not already enrolled
            const productExists = student.products.some(
                (p) => p.saleId === data.id || p.productId.toString() === String(product._id)
            );

            if (!productExists) {
                student.products.push(productEnrollment);
            } else {
                // Update product status to active
                const productIndex = student.products.findIndex(
                    (p) => p.saleId === data.id || p.productId.toString() === String(product._id)
                );
                if (productIndex !== -1) {
                    student.products[productIndex].status = "active";
                    student.products[productIndex].saleId = data.id;
                    student.products[productIndex].saleReference = data.reference;
                    student.products[productIndex].paymentMethod = data.payment_method;
                    student.products[productIndex].amount = data.net_amount;
                }
            }

            // Update student data with latest information
            Object.assign(student, studentData);
            await student.save();
        } else {
            // Create new student
            student = await Student.create({
                ...studentData,
                products: [productEnrollment],
                telegram: {
                    status: "pending",
                },
            });
        }

        // Generate Telegram invite link
        const telegramResult = await addStudentToGroup(name, email);

        if (telegramResult.success && telegramResult.inviteLink) {
            console.log(`✅ Telegram invite link generated for ${name}: ${telegramResult.inviteLink}`);

            // Update student with pending status
            await Student.findByIdAndUpdate(student._id, {
                "telegram.status": "pending",
            });

            // TODO: Send invite link to student via email or other notification method
            // For now, log it so you can manually send it
            console.log(`
📧 SEND THIS INVITE LINK TO ${name} (${email}):
${telegramResult.inviteLink}

Product: ${product.name}
            `);
        } else {
            console.error(`❌ Failed to generate Telegram invite for ${name}:`, telegramResult.error);

            await Student.findByIdAndUpdate(student._id, {
                "telegram.status": "failed",
            });
        }
    } catch (error) {
        console.error("Error handling student added:", error);
        // Don't throw - we don't want to fail the webhook if Telegram fails
    }
}

/**
 * Handle student removed (refund or chargeback)
 * Updates student status and removes from Telegram group
 */
async function handleStudentRemoved(email: string, reason: "refunded" | "chargeback") {
    try {
        // Find student
        const student = await Student.findOne({ email });

        if (!student) {
            console.warn(`Student not found for removal: ${email}`);
            return;
        }

        // Check if student has other active sales
        const activeSales = await Sale.find({
            "customer.email": email,
            status: "paid",
        });

        // If no active sales, remove from Telegram
        if (activeSales.length === 0) {
            if (student.telegram?.userId) {
                const removeResult = await removeStudentFromGroup(
                    student.telegram.userId,
                    reason === "refunded" ? "Subscription refunded" : "Payment chargeback"
                );

                if (removeResult.success) {
                    console.log(`✅ Student ${student.name} removed from Telegram group (${reason})`);

                    await Student.findByIdAndUpdate(student._id, {
                        "telegram.status": "removed",
                        "telegram.removedAt": new Date(),
                        isActive: false,
                        $set: { "products.$[].status": "expired" },
                    });
                } else {
                    console.error(`❌ Failed to remove ${student.name} from Telegram:`, removeResult.error);
                }
            } else {
                // Student doesn't have Telegram linked, just mark as inactive
                console.log(`Student ${student.name} marked as inactive (no Telegram account linked)`);

                await Student.findByIdAndUpdate(student._id, {
                    isActive: false,
                    $set: { "products.$[].status": "expired" },
                });
            }
        } else {
            console.log(
                `Student ${student.name} still has ${activeSales.length} active sale(s), not removing from Telegram`
            );

            // Just mark the refunded product as expired
            await Student.updateOne(
                { _id: student._id },
                {
                    $set: {
                        "products.$[elem].status": "refunded",
                    },
                },
                {
                    arrayFilters: [{ "elem.status": "active" }],
                }
            );
        }
    } catch (error) {
        console.error("Error handling student removed:", error);
        // Don't throw - we don't want to fail the webhook if Telegram fails
    }
}
