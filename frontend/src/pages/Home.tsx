import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  
  // Redirect to dashboard by default
  navigate("/dashboard", { replace: true });
  
  return null;
}