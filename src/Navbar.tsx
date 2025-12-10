// src/Navbar.tsx
export default function Navbar() {
  return (
    // In React, use 'className' instead of 'class'
    <div className="text-left p-4 text-white">
      {/* Placeholder */}
      <a href="#" onClick={(e) => e.preventDefault()} className="mr-4 hover:text-blue-400">
        Info
      </a>

      {/* This link now points to your main home page (the Calculator) */}
      <a href="/" className="ml-4 mr-4 font-bold text-blue-400 hover:text-blue-300">
        Calculator
      </a>

      {/* Placeholder */}
      <a href="#" onClick={(e) => e.preventDefault()} className="ml-4 mr-4 hover:text-blue-400">
        Resources
      </a>
    </div>
  );
}
