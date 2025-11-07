import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Student from "@/models/Student";
import bot from "@/lib/telegram";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

/**
 * POST /api/telegram/sync-group
 * Sync Telegram group members - remove users who shouldn't be there
 *
 * This endpoint:
 * 1. Gets all students with active Telegram status
 * 2. Verifies if they should still be in the group (isActive + has active product)
 * 3. Removes students who no longer qualify
 * 4. Updates their status in database
 *
 * Authentication:
 * - User session (manual trigger)
 * - API key (cronjob)
 */
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        // Check authentication
        const session = await auth();
        const apiKey = request.headers.get("x-api-key");

        let userId: string | null = null;

        if (session?.user?.id) {
            userId = session.user.id;
        } else if (apiKey && apiKey === process.env.SYNC_API_KEY) {
            // Valid API key for cronjob
            const body = await request.json().catch(() => ({}));
            userId = body.userId || null;
        } else {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const syncResults = {
            checked: 0,
            removed: 0,
            kept: 0,
            errors: [] as string[],
            details: [] as string[],
        };

        // Get chat administrators to avoid removing them
        const admins = await bot.telegram.getChatAdministrators(CHAT_ID);
        const adminIds = new Set(admins.map(admin => admin.user.id));

        console.log(`\n🔍 Found ${admins.length} admins in group`);

        // Strategy 1: Check students with Telegram userId registered
        const studentsWithTelegramQuery = userId
            ? { userId, "telegram.userId": { $exists: true, $ne: null } }
            : { "telegram.userId": { $exists: true, $ne: null } };

        const studentsWithTelegram = await Student.find(studentsWithTelegramQuery);

        console.log(`\n📋 Found ${studentsWithTelegram.length} students with Telegram registered`);

        for (const student of studentsWithTelegram) {
            try {
                syncResults.checked++;

                const telegramUserId = student.telegram?.userId;
                if (!telegramUserId) continue;

                // Skip if user is admin/owner
                if (adminIds.has(telegramUserId)) {
                    console.log(`  ⚡ Skipping admin/owner: ${student.name} (@${student.telegram?.username})`);
                    syncResults.kept++;
                    continue;
                }

                // Check if student should still be in group
                const hasActiveProduct = student.products.some(p => p.status === "active");
                const shouldBeInGroup = student.isActive && hasActiveProduct;

                if (!shouldBeInGroup && student.telegram?.status === "active") {
                    // Student should be removed
                    console.log(`  🚫 Removing ${student.name}: isActive=${student.isActive}, hasActiveProduct=${hasActiveProduct}`);

                    try {
                        // Try to remove from group
                        await bot.telegram.banChatMember(CHAT_ID, telegramUserId);

                        // Unban immediately to allow them to rejoin later if they qualify again
                        await bot.telegram.unbanChatMember(CHAT_ID, telegramUserId);

                        // Update student status
                        student.telegram.status = "removed";
                        student.telegram.removedAt = new Date();
                        await student.save();

                        syncResults.removed++;
                        syncResults.details.push(
                            `Removed ${student.name} (@${student.telegram?.username}): No active products or inactive`
                        );
                    } catch (removeError: any) {
                        // User might have already left or was removed manually
                        if (removeError.response?.description?.includes("user is not a member")) {
                            console.log(`  ℹ️  ${student.name} is not in group anymore, updating status`);
                            student.telegram.status = "removed";
                            student.telegram.removedAt = new Date();
                            await student.save();
                            syncResults.removed++;
                            syncResults.details.push(`${student.name} was not in group (already left/removed)`);
                        } else {
                            throw removeError;
                        }
                    }
                } else if (shouldBeInGroup && student.telegram?.status === "active") {
                    // Student should stay in group
                    console.log(`  ✅ Keeping ${student.name} in group`);
                    syncResults.kept++;
                } else if (!shouldBeInGroup && student.telegram?.status !== "active") {
                    // Already marked as removed/pending
                    console.log(`  ℹ️  ${student.name} already has status: ${student.telegram?.status}`);
                }

            } catch (error: any) {
                const errorMsg = `Error processing student ${student.name}: ${
                    error instanceof Error ? error.message : String(error)
                }`;
                console.error(`  ❌ ${errorMsg}`);
                syncResults.errors.push(errorMsg);
            }
        }

        // Strategy 2: Get all students (in case some joined but userId wasn't captured)
        console.log(`\n🔍 Checking all students to find unregistered members...`);
        const allStudentsQuery = userId ? { userId } : {};
        const allStudents = await Student.find(allStudentsQuery);

        // Create a map of registered telegram user IDs
        const registeredTelegramIds = new Set(
            studentsWithTelegram
                .filter(s => s.telegram?.userId)
                .map(s => s.telegram!.userId!)
        );

        console.log(`\n📊 Total students in database: ${allStudents.length}`);
        console.log(`📊 Students with Telegram registered: ${registeredTelegramIds.size}`);
        console.log(`📊 Admins in group: ${adminIds.size}`);

        console.log(`\n✅ Sync completed!`);
        console.log(`📊 Results:
  - Students checked: ${syncResults.checked}
  - Removed: ${syncResults.removed}
  - Kept in group: ${syncResults.kept}
  - Errors: ${syncResults.errors.length}
`);

        return NextResponse.json({
            success: true,
            message: `Group sync completed. Checked ${syncResults.checked} students, removed ${syncResults.removed}, kept ${syncResults.kept}.`,
            results: syncResults,
        });

    } catch (error: unknown) {
        console.error("Error syncing Telegram group:", error);
        return NextResponse.json(
            {
                error: "Error syncing Telegram group",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/telegram/sync-group
 * Get sync status
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Get Telegram statistics
        const totalWithTelegram = await Student.countDocuments({
            userId: session.user.id,
            "telegram.userId": { $exists: true, $ne: null },
        });

        const activeInTelegram = await Student.countDocuments({
            userId: session.user.id,
            "telegram.status": "active",
        });

        const pendingInvites = await Student.countDocuments({
            userId: session.user.id,
            "telegram.status": "pending",
        });

        const removed = await Student.countDocuments({
            userId: session.user.id,
            "telegram.status": "removed",
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalWithTelegram,
                activeInTelegram,
                pendingInvites,
                removed,
            },
        });

    } catch (error: unknown) {
        console.error("Error getting sync status:", error);
        return NextResponse.json(
            {
                error: "Error getting sync status",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
