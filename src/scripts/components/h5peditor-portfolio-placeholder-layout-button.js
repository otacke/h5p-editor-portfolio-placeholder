import Util from './../h5peditor-portfolio-placeholder-util';

export default class LayoutButton {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClicked: (() => {}),
      onDoubleClicked: (() => {})
    }, callbacks);

    // DOM content of button
    this.buttonContent = null;

    // Build button element
    if (params.type === 'button') {
      this.button = document.createElement('button');
      this.button.classList.add('h5peditor-portfolio-placeholder-layout-template-button');
    }
    else {
      this.button = document.createElement('div');
    }

    this.button.classList.add('h5peditor-portfolio-placeholder-layout-template-col');
    this.setNumberOfColumns(params.columns);

    // Event listener for single click
    this.button.addEventListener('click', (event) => {
      this.callbacks.onClicked(params.id, event);
    });

    // Event listener for double click
    this.button.addEventListener('click', (event) => {
      Util.doubleClick(event, () => {
        this.callbacks.onDoubleClicked(params.id, event);
      });
    });
  }

  /**
   * Get button DOM.
   * @return {HTMLElement} Button DOM.
   */
  getDOM() {
    return this.button;
  }

  /**
   * Resize button to fit content (H5P instance) inside.
   */
  resize() {
    if (!this.buttonInstance) {
      return;
    }

    this.setHeight(2 + this.buttonInstance.scrollHeight);
  }

  /**
   * Get height.
   * @return {number} Offset height.
   */
  getHeight() {
    return this.button.offsetHeight;
  }

  /**
   * Set button height. Defaults numbers to px.
   * @param {string|number} height Height.
   */
  setHeight(height) {
    if (typeof height === 'number') {
      height = `${height}px`;
    }

    if (typeof height !== 'string') {
      return; // Invalid
    }

    this.button.style.height = height;
  }

  /**
   * Set number of columns for row that button is in.
   * @param {number} columns Number of columns.
   */
  setNumberOfColumns(columns) {
    if (typeof columns !== 'number' || columns < 1) {
      return; // Invalid
    }

    this.button.style.width = `${ 100 / columns }%`;
  }

  /**
   * Set button content.
   * @param {HTMLElement} content Button content.
   * @param {HTMLElement} instanceDOM DOM element that instance is attached to.
   */
  setContent(content, instanceDOM) {
    this.buttonContent = content || null;
    this.buttonInstance = instanceDOM || null;

    this.button.classList.toggle('has-preview', content instanceof HTMLElement);
    this.button.innerHTML = '';
    this.setHeight('');

    if (content instanceof HTMLElement) {
      this.button.appendChild(content);
    }

    window.requestAnimationFrame(() => {
      this.resize();
    });
  }

  /**
   * Set button content hidden.
   * @param {boolean} state Hidden state.
   */
  setContentHidden(state) {
    if (!this.buttonContent) {
      return; // No content
    }

    this.buttonContent.classList.toggle(
      'h5p-editor-placeholder-instance-hidden',
      state
    );
  }

  /**
   * Focus.
   */
  focus() {
    this.button.focus();
  }
}
