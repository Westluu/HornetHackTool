import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Footer from './components/Footer';
import Doc from './pages/Doc';
import Home from './pages/Home';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/document/:id' element={<Doc />} />
      </Routes>
      {/* <Footer /> */}
    </Router>
  );
};

export default App;
