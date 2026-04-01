import { redirect } from "next/navigation";
import { getSessionUser } from "@/utils/getSessionUser";
import { getOAuthAccount } from "@/utils/cadAuth";
import CadConnectPage from "@/components/cadConnect/CadConnectPage";

export default async function CadConnectServerPage() {
  let session;
  try {
    session = await getSessionUser();
  } catch {
    redirect("/login");
  }

  const [onshapeAccount, fusionAccount] = await Promise.all([
    getOAuthAccount("onshape", session.userId),
    getOAuthAccount("fusion", session.userId),
  ]);

  return (
    <CadConnectPage
      onshapeConnected={!!onshapeAccount}
      fusionConnected={!!fusionAccount}
    />
  );
}
