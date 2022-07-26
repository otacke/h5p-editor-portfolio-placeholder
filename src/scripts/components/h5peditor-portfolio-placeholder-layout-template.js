import Util from './../h5peditor-portfolio-placeholder-util';
import LayoutButton from './h5peditor-portfolio-placeholder-layout-button';

export default class LayoutTemplate {

  /**
   * @constructor
   * @param {object} params Parameters.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClicked: (() => {}),
      onDoubleClicked: (() => {})
    }, callbacks);

    this.buttons = {};
    this.layout = '1';

    this.hasClickListener =
      !!callbacks.onClicked ||
      !!callbacks.onDoubleClicked;

    this.container = document.createElement('div');
    this.container.classList.add('h5peditor-portfolio-placeholder-layout-template');
  }

  /**
   * Get template DOM.
   * @return {HTMLElement} Template DOM.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Set layout.
   * @param {string} layout Layout as x-y-... scheme.
   */
  setLayout(layout) {
    if (typeof layout !== 'string' || !/^[0-9]+(-[0-9]+)*$/.test(layout)) {
      return; // No valid layout
    }

    this.layout = layout;

    this.container.innerHTML = '';

    layout.split('-').forEach((colCount, currentRow, rows) => {
      colCount = Number(colCount);

      const rowDOM = document.createElement('div');
      rowDOM.classList.add('h5peditor-portfolio-placeholder-layout-template-row');
      rowDOM.style.height = `${ 100 / rows.length }%`;

      for (let i = 0; i < colCount; i++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), i);

        // Create and add new button if required
        if (!this.buttons[id]) {
          this.buttons[id] = new LayoutButton(
            {
              columns: colCount,
              id: id,
              type: this.hasClickListener ? 'button' : 'div'
            },
            {
              onClicked: (id, event) => {
                this.callbacks.onClicked(id, event);
              },
              onDoubleClicked: (id, event) => {
                this.callbacks.onDoubleClicked(id, event);
              }
            }
          );
        }

        // Set number of columns in row according to layout
        this.buttons[id].setNumberOfColumns(colCount);

        rowDOM.appendChild(this.buttons[id].getDOM());
      }

      this.container.appendChild(rowDOM);
    });

    this.resize();
  }

  /**
   * Resize placeholders.
   */
  resize() {
    if (Object.keys(this.buttons).length === 0) {
      return;
    }

    // Resize buttons to match contents
    for (let id in this.buttons) {
      this.buttons[id].resize();
    }

    this.layout.split('-').forEach((colCount, currentRow, rows) => {
      colCount = Number(colCount);

      // Determine highest placeholder in row
      let highestHeight = 0;
      for (let i = 0; i < colCount; i++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), i);

        highestHeight = Math.max(highestHeight, this.buttons[id].getHeight());
      }

      if (highestHeight === 0) {
        highestHeight = ''; // Let browser decide.
      }

      // Set all placeholders in row to highest height
      for (let i = 0; i < colCount; i++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), i);

        this.buttons[id].setHeight(highestHeight);
      }
    });
  }

  /**
   * Set button content.
   * @param {number} id Button id.
   * @param {HTMLElement} content Button content.
   * @param {HTMLElement} instanceDOM Element that H5P is attached to.
   */
  setButtonContent(id, content, instanceDOM) {
    if (!this.buttons[id]) {
      return;
    }

    this.buttons[id].setContent(content, instanceDOM);
    this.resize();
  }

  /**
   * Set button content hidden.
   * @param {number} id Butto id.
   * @param {boolean} state Hidden state.
   */
  setButtonContentHidden(id, state) {
    if (!this.buttons[id] || typeof state !== 'boolean') {
      return;
    }

    this.buttons[id].setContentHidden(state);
  }

  /**
   * Focus button.
   * @param {number} id Button id.
   */
  focusButton(id) {
    if (!this.buttons[id]) {
      return;
    }

    this.buttons[id].focus();
  }
}
