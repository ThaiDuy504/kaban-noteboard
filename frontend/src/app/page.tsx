import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to boards page
  redirect("/boards");
}
