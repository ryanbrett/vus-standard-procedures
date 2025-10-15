import './App.css'
import Calculator from './components/Calculator';

function App() {
  return (
    <main className="font-sans">
      <div id="calculatorWrap" className="mb-8">
        <Calculator />
      </div>
      
      {/* We will add the PartSearch component here later */}
      {/* <div id="searchWrap"> ... </div> */}
    </main>
  )
}

export default App
