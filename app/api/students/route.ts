import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Student from "@/models/Student";
import User from "@/models/User";

/**
 * GET /api/students
 * Get all students for the authenticated user from database
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Find the user
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all students for this user
    const students = await Student.find({ userId: user._id })
      .populate("products.productId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Format students data
    const formattedStudents = students.map((student) => ({
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      phone: student.phone,
      cpf: student.cpf,
      isActive: student.isActive,
      telegram: {
        status: student.telegram?.status || "pending",
        userId: student.telegram?.userId,
        username: student.telegram?.username,
        addedAt: student.telegram?.addedAt,
        removedAt: student.telegram?.removedAt,
      },
      products: student.products.map((product) => ({
        productId: product.productId.toString(),
        productName: product.productName,
        enrolledAt: product.enrolledAt,
        status: product.status,
      })),
      lastSyncAt: student.lastSyncAt,
      createdAt: student.createdAt,
    }));

    return NextResponse.json({
      success: true,
      students: formattedStudents,
      total: formattedStudents.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      {
        error: "Error fetching students",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
