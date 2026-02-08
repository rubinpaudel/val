import type { Request, Response } from "express";
import { auth } from "@val/auth";
import { fromNodeHeaders } from "better-auth/node";
import { streamChatResponse } from "@val/api/modules/chat/chat-streaming.service";
import { chatService } from "@val/api/modules/chat/chat.service";

export async function handleChatStream(req: Request, res: Response) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { chatId, elementId, projectId, messages, init } = req.body;

    if (!chatId && !elementId && !projectId) {
      res.status(400).json({ error: "Missing chatId, elementId, or projectId" });
      return;
    }

    if (!messages) {
      res.status(400).json({ error: "Missing messages" });
      return;
    }

    // Resolve chatId: use provided, or get-or-create from elementId/projectId
    let resolvedChatId = chatId as string;
    if (!resolvedChatId) {
      const chat = await chatService.create(session.user.id, {
        elementId: elementId || undefined,
        projectId: projectId || undefined,
      });
      resolvedChatId = chat.id;
    }

    const result = await streamChatResponse(session.user.id, {
      chatId: resolvedChatId,
      messages,
      init: !!init,
    });

    result.pipeUIMessageStreamToResponse(res, {
      headers: { "X-Chat-Id": resolvedChatId },
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
