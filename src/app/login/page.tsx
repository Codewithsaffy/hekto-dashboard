"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!router) {
      console.error("Router is not available");
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "admin@gmail.com" && password === "admin12332") {
      localStorage.setItem("authorized", "true");
      router.push("/");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-white">Login</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-gray-300">Email</label>
            <input
              type="email"
              className="w-full p-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-300">Password</label>
            <input
              type="password"
              className="w-full p-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full p-2 font-bold text-white bg-gray-600 rounded hover:bg-gray-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
