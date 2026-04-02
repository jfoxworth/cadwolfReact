// import SideMenu from "@/components/side-menu/SideMenu"; // hidden — kept for reference
import SideMenuNew from "@/components/side-menu/SideMenuNew";
import HexBackground from "@/components/HexBackground";
import VerificationBanner from "@/components/VerificationBanner";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import { SideMenuAddProvider } from "@/context/SideMenuAddContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { emailVerifiedAt: true },
  });
  const emailVerified = !!dbUser?.emailVerifiedAt;

  return (
    <SideMenuAddProvider>
      <div className="flex min-h-screen bg-gray-50">
        <HexBackground />
        {/* <SideMenu user={{ id: user.userId, name: user.userName, email: user.userEmail }} /> */}
        {/* SideMenuNew is position:fixed — takes no layout space */}
        <SideMenuNew user={{ id: user.userId, name: user.userName, email: user.userEmail, username: user.userUsername ?? null }} />
        <main className="w-full h-screen overflow-y-auto">
          {!emailVerified && <VerificationBanner email={user.userEmail} />}
          {children}
        </main>
      </div>
    </SideMenuAddProvider>
  );
}
