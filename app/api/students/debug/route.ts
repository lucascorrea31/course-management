import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Student from "@/models/Student";

/**
 * GET /api/students/debug
 * Debug endpoint to see all students and their telegram status
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const students = await Student.find({ userId: session.user.id });

        const debug = students.map(student => ({
            name: student.name,
            email: student.email,
            isActive: student.isActive,
            telegram: {
                status: student.telegram?.status,
                userId: student.telegram?.userId,
                username: student.telegram?.username,
            },
            products: student.products.map(p => ({
                name: p.productName,
                status: p.status,
            })),
        }));

        return NextResponse.json({
            success: true,
            total: students.length,
            students: debug,
        });

    } catch (error: unknown) {
        console.error("Error getting students debug:", error);
        return NextResponse.json(
            {
                error: "Error getting students debug",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
