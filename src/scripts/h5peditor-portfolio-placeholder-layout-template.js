import Util from './h5peditor-portfolio-placeholder-util';

export default class LayoutTemplate {

  /**
   * @constructor
   * @param {object} params Parameters.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClicked: (() => {})
    }, callbacks);

    this.hasCallbackOnClicked = !!callbacks.onClicked;

    this.container = document.createElement('div');
    this.container.classList.add('h5peditor-portfolio-placeholder-layout-template');

    if (this.params.layout) {
      this.setLayout(this.params.layout);
    }
  }

  /**
   * Get template DOM.
   * @return {HTMLElement} Template DOM.
   */
  getDOM() {
    return this.container;
  }

  /**
   * setLayout.
   * @param {string} layout Layout as x-y-... scheme.
   */
  setLayout(layout) {
    this.container.innerHTML = '';

    layout.split('-').forEach((colCount, currentRow, rows) => {
      colCount = Number(colCount);

      const rowDOM = document.createElement('div');
      rowDOM.classList.add('h5peditor-portfolio-placeholder-layout-template-row');
      rowDOM.style.height = `${ 100 / rows.length }%`;

      for (let i = 0; i < colCount; i++) {
        const colDOM = (this.hasCallbackOnClicked) ?
          document.createElement('button') :
          document.createElement('div');

        colDOM.classList.add('h5peditor-portfolio-placeholder-layout-template-col');
        colDOM.style.width = `${ 100 / colCount }%`;

        if (this.hasCallbackOnClicked) {
          colDOM.addEventListener('click', (event) => {
            let buttonId = rows
              .slice(0, currentRow)
              .reduce((sum, current) => sum + Number(current), i);

            this.callbacks.onClicked(buttonId, event);
          });
        }

        rowDOM.appendChild(colDOM);
      }

      this.container.appendChild(rowDOM);
    });
  }
}
