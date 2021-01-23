import 'whatwg-fetch';
import ReactDOM from 'react-dom';
import MainContainer from './containers/MainContainer';
import NavBarContainer from './containers/NavBarContainer';

function App() {
  return (
    <>
      <NavBarContainer />
      <MainContainer />
    </>
  );
}

ReactDOM.render(<App />, document.querySelector('.app'));
