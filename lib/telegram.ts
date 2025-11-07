import { Telegraf } from "telegraf";

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || "");

// Chat ID where students will be managed (group or supergroup)
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
}

export interface AddStudentResult {
  success: boolean;
  message: string;
  inviteLink?: string;
  error?: string;
}

export interface RemoveStudentResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface GroupMember {
  userId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  status: string;
}

/**
 * Generate an invite link for the Telegram group
 * This link can be sent to students to join the group
 */
export async function generateInviteLink(
  expiresInSeconds?: number,
  memberLimit?: number
): Promise<string> {
  try {
    if (!CHAT_ID) {
      throw new Error("TELEGRAM_CHAT_ID is not configured");
    }

    const inviteLink = await bot.telegram.createChatInviteLink(CHAT_ID, {
      expire_date: expiresInSeconds
        ? Math.floor(Date.now() / 1000) + expiresInSeconds
        : undefined,
      member_limit: memberLimit,
    });

    return inviteLink.invite_link;
  } catch (error) {
    console.error("Error generating invite link:", error);
    throw error;
  }
}

/**
 * Add a student to the Telegram group by generating an invite link
 * Returns the invite link that should be sent to the student
 */
export async function addStudentToGroup(
  studentEmail: string,
  studentName: string
): Promise<AddStudentResult> {
  try {
    if (!bot.token) {
      return {
        success: false,
        message: "Telegram bot token is not configured",
        error: "TELEGRAM_BOT_TOKEN is missing",
      };
    }

    if (!CHAT_ID) {
      return {
        success: false,
        message: "Telegram chat ID is not configured",
        error: "TELEGRAM_CHAT_ID is missing",
      };
    }

    // Generate a unique invite link for this student
    // Link expires in 7 days and can only be used once
    const inviteLink = await generateInviteLink(7 * 24 * 60 * 60, 1);

    console.log(
      `Generated invite link for ${studentName} (${studentEmail}): ${inviteLink}`
    );

    return {
      success: true,
      message: `Invite link generated for ${studentName}`,
      inviteLink,
    };
  } catch (error) {
    console.error("Error adding student to group:", error);
    return {
      success: false,
      message: "Failed to generate invite link",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove a student from the Telegram group
 * Requires the Telegram user ID
 */
export async function removeStudentFromGroup(
  telegramUserId: number,
  reason: string = "Subscription expired"
): Promise<RemoveStudentResult> {
  try {
    if (!bot.token) {
      return {
        success: false,
        message: "Telegram bot token is not configured",
        error: "TELEGRAM_BOT_TOKEN is missing",
      };
    }

    if (!CHAT_ID) {
      return {
        success: false,
        message: "Telegram chat ID is not configured",
        error: "TELEGRAM_CHAT_ID is missing",
      };
    }

    // Ban the user from the group
    await bot.telegram.banChatMember(CHAT_ID, telegramUserId);

    // Immediately unban to allow them to join again in the future if they repurchase
    await bot.telegram.unbanChatMember(CHAT_ID, telegramUserId);

    console.log(
      `Removed user ${telegramUserId} from group. Reason: ${reason}`
    );

    return {
      success: true,
      message: `Student removed from group. Reason: ${reason}`,
    };
  } catch (error) {
    console.error("Error removing student from group:", error);
    return {
      success: false,
      message: "Failed to remove student from group",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a user is a member of the group
 */
export async function isUserInGroup(telegramUserId: number): Promise<boolean> {
  try {
    if (!CHAT_ID) {
      throw new Error("TELEGRAM_CHAT_ID is not configured");
    }

    const member = await bot.telegram.getChatMember(CHAT_ID, telegramUserId);

    // User is in group if status is: creator, administrator, member, or restricted
    return ["creator", "administrator", "member", "restricted"].includes(
      member.status
    );
  } catch (error) {
    console.error("Error checking if user is in group:", error);
    return false;
  }
}

/**
 * Get all members of the Telegram group
 * Note: This only works for small groups (< 200 members)
 * For larger groups, you need to use the Telegram Bot API with additional permissions
 */
export async function getGroupMembers(): Promise<GroupMember[]> {
  try {
    if (!CHAT_ID) {
      throw new Error("TELEGRAM_CHAT_ID is not configured");
    }

    // Note: This method requires the bot to be an administrator
    // For groups with more than 200 members, you'll need to use a different approach
    const administrators = await bot.telegram.getChatAdministrators(CHAT_ID);

    const members: GroupMember[] = administrators.map((admin) => ({
      userId: admin.user.id,
      username: admin.user.username,
      firstName: admin.user.first_name,
      lastName: admin.user.last_name,
      status: admin.status,
    }));

    return members;
  } catch (error) {
    console.error("Error getting group members:", error);
    throw error;
  }
}

/**
 * Send a message to the Telegram group
 */
export async function sendMessageToGroup(message: string): Promise<boolean> {
  try {
    if (!CHAT_ID) {
      throw new Error("TELEGRAM_CHAT_ID is not configured");
    }

    await bot.telegram.sendMessage(CHAT_ID, message, {
      parse_mode: "Markdown",
    });

    return true;
  } catch (error) {
    console.error("Error sending message to group:", error);
    return false;
  }
}

/**
 * Send a welcome message to a student with the invite link
 */
export async function sendWelcomeMessage(
  studentName: string,
  inviteLink: string,
  productName: string
): Promise<boolean> {
  try {
    const message = `
🎉 *Welcome ${studentName}!*

You have been enrolled in *${productName}*!

Click the link below to join our exclusive Telegram group:
${inviteLink}

⚠️ *Important:*
- This link is valid for 7 days
- This link can only be used once
- Keep your subscription active to maintain access

If you have any questions, feel free to reach out!
    `.trim();

    return await sendMessageToGroup(message);
  } catch (error) {
    console.error("Error sending welcome message:", error);
    return false;
  }
}

/**
 * Get bot information
 */
export async function getBotInfo() {
  try {
    return await bot.telegram.getMe();
  } catch (error) {
    console.error("Error getting bot info:", error);
    throw error;
  }
}

/**
 * Verify bot configuration
 */
export async function verifyBotConfig(): Promise<{
  valid: boolean;
  botInfo?: TelegramUser;
  error?: string;
}> {
  try {
    if (!bot.token) {
      return {
        valid: false,
        error: "TELEGRAM_BOT_TOKEN is not configured",
      };
    }

    if (!CHAT_ID) {
      return {
        valid: false,
        error: "TELEGRAM_CHAT_ID is not configured",
      };
    }

    const botInfo = await getBotInfo();

    // Test if bot has access to the chat
    await bot.telegram.getChat(CHAT_ID);

    return {
      valid: true,
      botInfo: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default bot;
