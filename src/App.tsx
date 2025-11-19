// src/App.tsx
import './App.css'
import Navbar from './Navbar';
import Calculator from './components/Calculator';
import PartSearch from './components/PartSearch';

function App() {
  return (
    <main className="font-sans pb-20"> {/* Added padding bottom for scrolling space */}
      <Navbar /> 
      <div id="calculatorWrap" className="mb-8">
        <Calculator />
      </div>
      
      <div id="searchWrap">
         <PartSearch />  {/* <-- Render it */}
      </div>
    </main>
  );
}

export default App;
