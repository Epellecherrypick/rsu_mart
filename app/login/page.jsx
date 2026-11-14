import LoginForm from "./login-form";

export const metadata = {
  title: "Sign in or create an account — RSU Mart",
};

function safeNextPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }
  return value;
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  return <LoginForm nextPath={safeNextPath(params?.next)} />;
}
