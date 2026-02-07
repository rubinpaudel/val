import type { Request, Response } from "express";
import { auth } from "@val/auth";
import { fromNodeHeaders } from "better-auth/node";
import { streamChatResponse } from "@val/api/modules/chat/chat-streaming.service";

export async function handleChatStream(req: Request, res: Response) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { chatId, messages } = req.body;

    if (!chatId || !messages) {
      res.status(400).json({ error: "Missing chatId or messages" });
      return;
    }

    const result = await streamChatResponse(session.user.id, {
      chatId,
      messages,
    });

    // Use the StreamTextResult's built-in method to pipe to Express response
    result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
