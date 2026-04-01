import { redirect } from "next/navigation";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import ProfileForm from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  let session;
  try {
    session = await getSessionUser();
  } catch {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      photoUrl: true,
      title: true,
      bio: true,
      organization: true,
      location: true,
      website: true,
      phone: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen py-12 flex justify-center">
      <div className="w-full max-w-2xl px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-500 mb-8">Manage your account information</p>
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
