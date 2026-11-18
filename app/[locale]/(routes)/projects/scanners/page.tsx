import { Box } from "@mui/material";
import { MuiPageHeader } from "@/components/mui/MuiPageHeader";
import { requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import ScannerTable from "./ScannerTable";

export default async function ScannersPage() {
  await requireAuthenticated();
  const scanners = await prismadb.projectScanner.findMany({
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
      <MuiPageHeader title="Opportunities Scanner" />
      <ScannerTable scanners={scanners} />
    </Box>
  );
}
