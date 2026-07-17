import { Outlet, Link } from "react-router-dom";

export default function RootLayout() {
  return (
    <div className="app-container">
      <nav style={{ display: "flex", gap: "10px", padding: "10px", background: "#000" }}>
        <Link to="/">Home</Link>
        <Link to="/Search">Search</Link>
      </nav>
      
      <main style={{ padding: "20px" }}>
        {/* Child routes inject their components here */}
        <Outlet /> 
      </main>
    </div>
  );
}
