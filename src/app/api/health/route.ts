export async function GET() {
  return Response.json(
    { status: "ok", service: "hamyar-web", mode: "foundation" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
