import { z } from "zod";
import { failure, ok } from "@/lib/http";
import { extractWithOpenAI } from "@/lib/openai-provider";
import { changeWorkspace } from "@/lib/repository";
import { loadLiveExtraction, loadReplayExtraction } from "@/lib/workflow";
const Input = z.object({ mode: z.enum(["replay", "live"]) });
export async function POST(request: Request) {
  try {
    const input = Input.parse(await request.json());
    return ok(
      await changeWorkspace(async (state) =>
        input.mode === "replay"
          ? loadReplayExtraction(state)
          : loadLiveExtraction(state, await extractWithOpenAI(state.sources)),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
