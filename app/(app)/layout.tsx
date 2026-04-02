// import SideMenu from "@/components/side-menu/SideMenu"; // hidden — kept for reference
import SideMenuNew from "@/components/side-menu/SideMenuNew";
import HexBackground from "@/components/HexBackground";
import VerificationBanner from "@/components/VerificationBanner";
import { getSessionUserOrNull } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import { SideMenuAddProvider } from "@/context/SideMenuAddContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserOrNull();

  let emailVerified = true;
  let sideMenuUser: { id: number; name: string; email: string; username: string | null } | null = null;

  if (session) {
    const dbUser = await db.user.findUnique({
      where: { id: session.userId },
      select: { emailVerifiedAt: true },
    });
    emailVerified = !!dbUser?.emailVerifiedAt;
    sideMenuUser = { id: session.userId, name: session.userName, email: session.userEmail, username: session.userUsername ?? null };
  }

  return (
    <SideMenuAddProvider>
      <div className="flex min-h-screen bg-gray-50">
        <HexBackground />
        {/* SideMenuNew is position:fixed — takes no layout space */}
        <SideMenuNew user={sideMenuUser} />
        <main className="w-full h-screen overflow-y-auto">
          {session && !emailVerified && <VerificationBanner email={session.userEmail} />}
          {children}
        </main>
      </div>
    </SideMenuAddProvider>
  );
}
