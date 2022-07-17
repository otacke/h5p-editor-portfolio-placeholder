import './../styles/h5peditor-portfolio-placeholder-editor-overlay.scss';

class PortfolioEditorOverlay {
  static getDOM() {
    return PortfolioEditorOverlay.overlay;
  }

  static setFormFields(fields) {
    PortfolioEditorOverlay.semantics.innerHTML = '';
    PortfolioEditorOverlay.semantics.appendChild(fields);
  }

  static show() {
    PortfolioEditorOverlay.overlay.classList.remove('display-none');
  }

  static hide() {
    PortfolioEditorOverlay.overlay.classList.add('display-none');
  }

  static setCallback(name, callback) {
    PortfolioEditorOverlay.callbacks[name] = callback;
  }
}

if (!PortfolioEditorOverlay.overlay) {
  PortfolioEditorOverlay.callbacks = {
    onRemoved: (() => {}),
    onDone: (() => {}),
  };

  PortfolioEditorOverlay.overlay = document.createElement('div');
  PortfolioEditorOverlay.overlay.classList.add('editor-overlay');

  const header = document.createElement('div');
  header.classList.add('editor-overlay-header');
  PortfolioEditorOverlay.overlay.appendChild(header);

  const icon = document.createElement('span');
  icon.classList.add('editor-overlay-title');
  icon.classList.add('editor-overlay-icon-todo');
  icon.innerText = 'TODO';
  header.appendChild(icon);

  const buttons = document.createElement('span');
  buttons.classList.add('buttons');

  const buttonRemove = document.createElement('button');
  buttonRemove.classList.add('button-remove');
  buttonRemove.addEventListener('click', () => {
    PortfolioEditorOverlay.callbacks.onRemoved();
  });
  buttonRemove.innerText = 'TODO: Remove';
  buttons.appendChild(buttonRemove);

  const buttonDone = document.createElement('button');
  buttonDone.classList.add('button-blue');
  buttonDone.addEventListener('click', () => {
    PortfolioEditorOverlay.callbacks.onDone();
  });
  buttonDone.innerText = 'TODO: Done';
  buttons.appendChild(buttonDone);

  header.appendChild(buttons);

  const contents = document.createElement('div');
  contents.classList.add('editor-overlay-content');

  PortfolioEditorOverlay.semantics = document.createElement('div');
  PortfolioEditorOverlay.semantics.classList.add('editor-overlay-semantics'); // Will be amended
  contents.appendChild(PortfolioEditorOverlay.semantics);
  PortfolioEditorOverlay.overlay.appendChild(contents);

  PortfolioEditorOverlay.hide();
}

H5PEditor.PortfolioEditorOverlay = PortfolioEditorOverlay;
