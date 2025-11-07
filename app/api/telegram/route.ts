import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Student from "@/models/Student";
import Sale from "@/models/Sale";
import { addStudentToGroup, removeStudentFromGroup, verifyBotConfig, isUserInGroup } from "@/lib/telegram";

/**
 * GET /api/telegram
 * Verify Telegram bot status and configuration
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const botStatus = await verifyBotConfig();

        return NextResponse.json({
            success: true,
            bot: botStatus,
        });
    } catch (error: unknown) {
        console.error("Error verifying bot:", error);
        return NextResponse.json(
            {
                error: "Error verifying bot configuration",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/telegram
 * Manage Telegram group operations
 *
 * Actions:
 * - add: Add student to group
 * - remove: Remove student from group
 * - sync: Sync group with active students
 * - check: Check if student is in group
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        const { action, studentEmail, telegramUserId, reason } = body;

        if (!action) {
            return NextResponse.json({ error: "Action is required" }, { status: 400 });
        }

        switch (action) {
            case "add":
                return await handleAddStudent(studentEmail, session.user.email);

            case "remove":
                return await handleRemoveStudent(studentEmail, telegramUserId, reason);

            case "sync":
                return await handleSyncGroup(session.user.email);

            case "check":
                return await handleCheckStudent(telegramUserId);

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error: unknown) {
        console.error("Error in Telegram API:", error);
        return NextResponse.json(
            {
                error: "Error processing request",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * Add a student to the Telegram group
 */
async function handleAddStudent(studentEmail: string, _userEmail: string) {
    if (!studentEmail) {
        return NextResponse.json({ error: "Student email is required" }, { status: 400 });
    }

    // Find the student in the database
    const student = await Student.findOne({
        email: studentEmail.toLowerCase().trim(),
    });

    if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if student has active sales
    const activeSales = await Sale.find({
        "customer.email": studentEmail.toLowerCase().trim(),
        status: "paid",
    });

    if (activeSales.length === 0) {
        return NextResponse.json({ error: "Student has no active subscriptions" }, { status: 400 });
    }

    // Generate invite link for the student
    const result = await addStudentToGroup(student.name, student.email);

    if (!result.success) {
        // Update student status to failed
        await Student.findByIdAndUpdate(student._id, {
            "telegram.status": "failed",
        });

        return NextResponse.json(
            {
                error: result.message,
                details: result.error,
            },
            { status: 500 }
        );
    }

    // Update student with pending status and invite link info
    await Student.findByIdAndUpdate(student._id, {
        "telegram.status": "pending",
        lastSyncAt: new Date(),
    });

    return NextResponse.json({
        success: true,
        message: result.message,
        inviteLink: result.inviteLink,
        student: {
            name: student.name,
            email: student.email,
        },
    });
}

/**
 * Remove a student from the Telegram group
 */
async function handleRemoveStudent(studentEmail: string, telegramUserId: number, reason?: string) {
    if (!studentEmail && !telegramUserId) {
        return NextResponse.json({ error: "Student email or Telegram user ID is required" }, { status: 400 });
    }

    // Find the student
    let student;
    if (studentEmail) {
        student = await Student.findOne({
            email: studentEmail.toLowerCase().trim(),
        });
    } else {
        student = await Student.findOne({
            "telegram.userId": telegramUserId,
        });
    }

    if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.telegram?.userId) {
        return NextResponse.json({ error: "Student does not have a Telegram account linked" }, { status: 400 });
    }

    // Remove student from group
    const result = await removeStudentFromGroup(student.telegram.userId, reason || "Removed by administrator");

    if (!result.success) {
        return NextResponse.json(
            {
                error: result.message,
                details: result.error,
            },
            { status: 500 }
        );
    }

    // Update student status
    await Student.findByIdAndUpdate(student._id, {
        "telegram.status": "removed",
        "telegram.removedAt": new Date(),
        lastSyncAt: new Date(),
    });

    // Update all products to expired
    await Student.findByIdAndUpdate(student._id, {
        $set: {
            "products.$[].status": "expired",
        },
    });

    return NextResponse.json({
        success: true,
        message: result.message,
        student: {
            name: student.name,
            email: student.email,
        },
    });
}

/**
 * Sync Telegram group with active students
 * Removes students who no longer have active subscriptions
 */
async function handleSyncGroup(_userEmail: string) {
    const results = {
        removed: 0,
        errors: 0,
        details: [] as string[],
    };

    // Find all students with active Telegram status
    const studentsInGroup = await Student.find({
        "telegram.status": "active",
        "telegram.userId": { $exists: true },
    });

    for (const student of studentsInGroup) {
        try {
            // Check if student has active sales
            const activeSales = await Sale.find({
                "customer.email": student.email,
                status: "paid",
            });

            if (activeSales.length === 0) {
                // No active sales, remove from group
                const result = await removeStudentFromGroup(student.telegram!.userId!, "Subscription expired");

                if (result.success) {
                    await Student.findByIdAndUpdate(student._id, {
                        "telegram.status": "removed",
                        "telegram.removedAt": new Date(),
                        $set: { "products.$[].status": "expired" },
                    });

                    results.removed++;
                    results.details.push(`Removed ${student.name} (${student.email}) - No active subscription`);
                } else {
                    results.errors++;
                    results.details.push(`Failed to remove ${student.name}: ${result.error}`);
                }
            }
        } catch (error) {
            results.errors++;
            results.details.push(
                `Error processing ${student.name}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return NextResponse.json({
        success: true,
        message: `Sync completed. Removed ${results.removed} students, ${results.errors} errors.`,
        results,
    });
}

/**
 * Check if a student is in the group
 */
async function handleCheckStudent(telegramUserId: number) {
    if (!telegramUserId) {
        return NextResponse.json({ error: "Telegram user ID is required" }, { status: 400 });
    }

    const isInGroup = await isUserInGroup(telegramUserId);

    const student = await Student.findOne({
        "telegram.userId": telegramUserId,
    });

    return NextResponse.json({
        success: true,
        isInGroup,
        student: student
            ? {
                  name: student.name,
                  email: student.email,
                  status: student.telegram?.status,
              }
            : null,
    });
}
