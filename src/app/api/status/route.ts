import { publicDeploymentStatus } from "@/modules/operations/deployment-status";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    publicDeploymentStatus(process.env, process.versions.node),
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
