import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getKiwifyClient } from "@/lib/kiwify";
import mongoose from "mongoose";

interface Student {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    products: {
        productId: string;
        productName: string;
        enrollmentDate: string;
        checkedIn: boolean;
        orderId: string;
    }[];
}

/**
 * GET - List all students from Kiwify events/products
 */
export async function GET(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Convert to ObjectId for proper comparison
        const userObjectId = new mongoose.Types.ObjectId(session.user.id);

        // Get all user's products
        const products = await Product.find({ userId: userObjectId });

        if (products.length === 0) {
            return NextResponse.json({ students: [] });
        }

        const kiwify = getKiwifyClient();

        // Map to store students by email (to aggregate across products)
        const studentsMap = new Map<string, Student>();

        // Fetch participants for each product
        for (const product of products) {
            try {
                const response = await kiwify.getEventParticipants(product.kiwifyId!, {
                    page_size: 100, // Fetch up to 100 participants per product
                });

                const participants = response.data.participants || [];

                for (const participant of participants) {
                    const email = participant.email.toLowerCase();

                    if (!studentsMap.has(email)) {
                        studentsMap.set(email, {
                            id: participant.id,
                            name: participant.name,
                            email: participant.email,
                            phone: participant.phone,
                            cpf: participant.cpf,
                            products: [],
                        });
                    }

                    const student = studentsMap.get(email)!;

                    // Add this product to the student's list
                    student.products.push({
                        productId: product.kiwifyId as any,
                        productName: product.name,
                        enrollmentDate: participant.created_at,
                        checkedIn: !!participant.checkin_at,
                        orderId: participant.order_id,
                    });
                }
            } catch (error) {
                console.error(`Error fetching participants for product ${product.name}:`, error);
                // Continue with other products even if one fails
            }
        }

        // Convert map to array and calculate stats
        const students = Array.from(studentsMap.values()).map((student) => ({
            ...student,
            totalPurchases: student.products.length,
            totalCheckins: student.products.filter((p) => p.checkedIn).length,
        }));

        // Sort by number of products (most active students first)
        students.sort((a, b) => b.totalPurchases - a.totalPurchases);

        return NextResponse.json({ students });
    } catch (error: unknown) {
        console.error("Error fetching students:", error);

        let errorMessage = "Error fetching students";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === "string") {
            errorMessage = error;
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
