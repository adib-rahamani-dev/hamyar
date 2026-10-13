/** Legacy UI fixtures are available only in explicit local development. */
export function localDemoEnabled(env: Record<string, string | undefined>) {
  return (
    env.NODE_ENV === "development" &&
    env.VERCEL !== "1" &&
    env.HAMYAR_LOCAL_DEMOS === "1"
  );
}
