import { NextResponse } from "next/server";
import { auth } from "@/auth";
import bot from "@/lib/telegram";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

/**
 * GET /api/telegram/members
 * Get all members from Telegram group (for debugging)
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get chat info
        const chat = await bot.telegram.getChat(CHAT_ID);

        // Get admins
        const admins = await bot.telegram.getChatAdministrators(CHAT_ID);

        const members = admins.map(admin => ({
            id: admin.user.id,
            username: admin.user.username,
            firstName: admin.user.first_name,
            lastName: admin.user.last_name,
            status: admin.status,
            isBot: admin.user.is_bot,
        }));

        return NextResponse.json({
            success: true,
            chat: {
                id: chat.id,
                title: 'title' in chat ? chat.title : undefined,
                type: chat.type,
            },
            totalMembers: admins.length,
            members,
            note: "Note: Telegram Bot API only returns admins. To see all members, the bot needs to iterate through member updates or use additional permissions.",
        });

    } catch (error: unknown) {
        console.error("Error getting Telegram members:", error);
        return NextResponse.json(
            {
                error: "Error getting Telegram members",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
