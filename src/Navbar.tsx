// src/Navbar.tsx
export default function Navbar() {
  return (
    // In React, use 'className' instead of 'class'
    <div className="text-left p-4 text-white">
      {/* Note: In a Single Page App (React), we usually don't use .html extensions.
         We point to routes like '/info' or '/calculator'. 
      */}
      <a href="/" className="mr-4">Info</a>
      <a href="/calculator" className="ml-4 mr-4">Calculator</a>
      <a href="/resources" className="ml-4">Resources</a>
    </div>
  );
}
