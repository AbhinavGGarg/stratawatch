import { DEMO_MODE_SCRIPT } from "@/mock-data/demo-mode";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const sseEvent = (payload: unknown): Uint8Array => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

export async function GET() {
  let idx = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const initial = DEMO_MODE_SCRIPT.slice(0, 1);
      controller.enqueue(sseEvent(initial));

      const timer = setInterval(() => {
        const event = DEMO_MODE_SCRIPT[idx % DEMO_MODE_SCRIPT.length];
        controller.enqueue(sseEvent([event]));
        idx += 1;

        if (idx >= DEMO_MODE_SCRIPT.length) {
          clearInterval(timer);
          controller.close();
        }
      }, 2500);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
