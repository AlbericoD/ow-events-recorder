import ReactDOM from 'react-dom';

import './styles/global.scss';

import { Main } from './components/Main/Main';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

const mountElement = document.createElement('div');
mountElement.id = 'app-root';
document.body.appendChild(mountElement);

window.addEventListener('beforeunload', e => {
  delete e.returnValue;

  ReactDOM.unmountComponentAtNode(mountElement);
});

ReactDOM.render(
  <ErrorBoundary>
    <Main />
  </ErrorBoundary>,
  mountElement
);
