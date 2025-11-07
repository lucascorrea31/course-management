import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Student from "@/models/Student";
import bot from "@/lib/telegram";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

/**
 * POST /api/telegram/webhook
 * Webhook to receive Telegram updates
 *
 * This captures:
 * - New members joining the group (to save their userId)
 * - Members leaving the group (to update status)
 */
export async function POST(request: NextRequest) {
    try {
        const update = await request.json();

        console.log("Received Telegram update:", JSON.stringify(update, null, 2));

        await dbConnect();

        // Handle new chat members
        if (update.message?.new_chat_members) {
            for (const member of update.message.new_chat_members) {
                // Skip bots
                if (member.is_bot) continue;

                console.log(`New member joined: ${member.first_name} (ID: ${member.id}, @${member.username})`);

                // Try to find student by telegram username or by pending invite
                const student = await Student.findOne({
                    $or: [
                        { "telegram.username": member.username },
                        { "telegram.status": "pending" },
                    ],
                });

                if (student) {
                    // Update student with Telegram userId
                    student.telegram = {
                        ...student.telegram,
                        userId: member.id,
                        username: member.username,
                        status: "active",
                        addedAt: new Date(),
                    };
                    await student.save();

                    console.log(`✅ Updated student ${student.name} with Telegram userId ${member.id}`);
                } else {
                    // Unknown member joined - check if they should be removed
                    console.log(`⚠️ Unknown member joined: ${member.first_name} (@${member.username})`);

                    // Check if user is admin
                    const admins = await bot.telegram.getChatAdministrators(CHAT_ID);
                    const isAdmin = admins.some(admin => admin.user.id === member.id);

                    if (!isAdmin) {
                        console.log(`🚫 Removing unknown member ${member.first_name} (not an admin and not a student)`);

                        try {
                            await bot.telegram.banChatMember(CHAT_ID, member.id);
                            await bot.telegram.unbanChatMember(CHAT_ID, member.id);

                            // Send message to group
                            await bot.telegram.sendMessage(
                                CHAT_ID,
                                `❌ Usuário ${member.first_name} foi removido por não estar registrado como aluno.`
                            );
                        } catch (error) {
                            console.error("Error removing unknown member:", error);
                        }
                    }
                }
            }
        }

        // Handle members leaving
        if (update.message?.left_chat_member) {
            const member = update.message.left_chat_member;

            console.log(`Member left: ${member.first_name} (ID: ${member.id})`);

            // Update student status
            const student = await Student.findOne({ "telegram.userId": member.id });

            if (student) {
                student.telegram = {
                    ...student.telegram,
                    status: "removed",
                    removedAt: new Date(),
                };
                await student.save();

                console.log(`✅ Updated student ${student.name} status to removed`);
            }
        }

        return NextResponse.json({ ok: true });

    } catch (error: unknown) {
        console.error("Error processing Telegram webhook:", error);
        return NextResponse.json(
            {
                error: "Error processing webhook",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/telegram/webhook
 * Setup or get webhook info
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");

        if (action === "setup") {
            // Get the webhook URL
            const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
            const webhookUrl = `${baseUrl}/api/telegram/webhook`;

            // Set webhook
            await bot.telegram.setWebhook(webhookUrl);

            return NextResponse.json({
                success: true,
                message: "Webhook configured successfully",
                webhookUrl,
            });
        } else if (action === "info") {
            // Get webhook info
            const info = await bot.telegram.getWebhookInfo();

            return NextResponse.json({
                success: true,
                webhook: info,
            });
        } else if (action === "delete") {
            // Delete webhook
            await bot.telegram.deleteWebhook();

            return NextResponse.json({
                success: true,
                message: "Webhook deleted successfully",
            });
        }

        return NextResponse.json({
            success: false,
            message: "Invalid action. Use ?action=setup, ?action=info, or ?action=delete",
        });

    } catch (error: unknown) {
        console.error("Error managing webhook:", error);
        return NextResponse.json(
            {
                error: "Error managing webhook",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
