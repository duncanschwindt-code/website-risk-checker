export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNodeInstrumentation } =
      await import("@/lib/instrumentation-node");
    registerNodeInstrumentation();
  }
}
