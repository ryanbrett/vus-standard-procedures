// src/App.tsx
import './App.css'
import Calculator from './components/Calculator';
import PartSearch from './components/PartSearch'; // <-- Import it

function App() {
  return (
    <main className="font-sans pb-20"> {/* Added padding bottom for scrolling space */}
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
