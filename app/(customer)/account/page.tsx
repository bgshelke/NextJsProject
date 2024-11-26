import { ProfileCard } from "../_components/ProfileCard";

export const metadata = {
  title: "Account",
  description: "Manage your account settings.",
};
export default function Page() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">My Profile</h1>
      <ProfileCard/>
    </div>
  );
}
