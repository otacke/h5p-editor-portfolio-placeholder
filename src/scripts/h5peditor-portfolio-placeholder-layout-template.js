import Util from './h5peditor-portfolio-placeholder-util';

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

  setButtonContent(id, content) {
    this.buttons[id] = this.buttons[id] || {};
    this.buttons[id].content = content;
  }

  /**
   * setLayout.
   * @param {string} layout Layout as x-y-... scheme.
   */
  setLayout(layout) {
    if (
      layout && typeof layout !== 'string' &&
      typeof parseInt(layout) === 'number'
    ) {
      layout = layout.toString();
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

        const colDOM = (this.hasClickListener) ?
          document.createElement('button') :
          document.createElement('div');

        colDOM.classList.add('h5peditor-portfolio-placeholder-layout-template-col');
        colDOM.style.width = `${ 100 / colCount }%`;

        if (this.hasClickListener) {
          colDOM.addEventListener('click', (event) => {
            this.callbacks.onClicked(id, event);
          });
          colDOM.addEventListener('click', (event) => {
            Util.doubleClick(event, () => {
              this.callbacks.onDoubleClicked(id, event);
            });
          });

          this.buttons[id] = this.buttons[id] || {};
          this.buttons[id].dom = colDOM;

          this.buttons[id].dom.innerHTML = '';
          if (this.buttons[id].content) {
            this.buttons[id].dom.classList.add('has-preview');
            this.buttons[id].dom.appendChild(this.buttons[id].content);
          }
          else {
            this.buttons[id].dom.classList.remove('has-preview');
          }
        }

        rowDOM.appendChild(colDOM);
      }

      this.container.appendChild(rowDOM);
    });
  }

  /**
   * Resize placeholders.
   */
  resize() {
    this.layout.split('-').forEach((colCount, currentRow, rows) => {
      colCount = Number(colCount);

      // Determine highest placeholder in row
      let highestHeight = 0;
      for (let i = 0; i < colCount; i++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), i);

        highestHeight = Math.max(highestHeight, this.buttons[id].dom.offsetHeight);
      }

      // Set all placeholders in row to highest height
      for (let i = 0; i < colCount; i++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), i);

        this.buttons[id].dom.style.height = `${highestHeight}px`;
      }
    });
  }

  /**
   * Get button for id.
   * @param {number} id Id.
   * @return {HTMLElement} Button.
   */
  getButton(id) {
    if (!this.buttons[id]) {
      return null;
    }

    return this.buttons[id].dom;
  }
}
