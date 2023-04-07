import Util from './../h5peditor-portfolio-placeholder-util';
import LayoutButton from './h5peditor-portfolio-placeholder-layout-button';
import PortfolioPlaceholderSizeSlider from './preview/h5peditor-portfolio-placeholder-size-slider';

export default class LayoutTemplate {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClicked: () => {},
      onDoubleClicked: () => {},
      onReordered: () => {},
      onChanged: () => {}
    }, callbacks);

    this.forms = {};
    this.buttons = {};
    this.separators = {};
    this.layout = '1';

    this.hasClickListener =
      !!callbacks.onClicked ||
      !!callbacks.onDoubleClicked;

    this.container = document.createElement('div');
    this.container.classList.add('h5peditor-portfolio-placeholder-layout-template');
  }

  /**
   * Get template DOM.
   *
   * @returns {HTMLElement} Template DOM.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Set layout.
   *
   * TODO: This needs Refactoring after getting new requirements.
   *
   * @param {object} [params = {}] Parameters.
   * @param {string} params.layout Layout.
   * @param {number[]} params.growHorizontals Grow values.
   */
  setLayout(params = {}) {
    if (!Util.validateLayout(params.layout)) {
      return; // No valid layout
    }

    this.layout = params.layout;

    this.container.innerHTML = '';

    params.layout.split('-').forEach((colCount, currentRow, rows) => {
      colCount = Number(colCount);

      const rowDOM = document.createElement('div');
      rowDOM.classList.add('h5peditor-portfolio-placeholder-layout-template-row');
      rowDOM.style.height = `${ 100 / rows.length }%`;

      let totalSpaceHorizontal;
      if (params.growHorizontals) {
        // Normalize grow proportions to make robust
        const previousNum = rows
          .slice(0, currentRow)
          .reduce((total, current) => {
            return total + Number(current);
          }, 0);
        const currentNum = Number(rows[currentRow]);

        totalSpaceHorizontal = params.growHorizontals
          .slice(previousNum, previousNum + currentNum)
          .reduce((space, field) => {
            return space + Number(field);
          }, 0);
      }

      for (let currentCol = 0; currentCol < colCount; currentCol++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), currentCol);

        const width = params.growHorizontals ?
          100 * params.growHorizontals[id] / totalSpaceHorizontal :
          100 / colCount;

        // Create and add new button if required
        if (!this.buttons[id]) {
          const buttonUUID = H5P.createUUID();

          this.buttons[id] = new LayoutButton(
            {
              columns: colCount,
              id: id,
              uuid: buttonUUID,
              width: width,
              type: this.hasClickListener ? 'button' : 'div'
            },
            {
              onClicked: ((id, event) => {
                this.callbacks.onClicked(id, event);
              }),
              onDoubleClicked: ((id, event) => {
                this.callbacks.onDoubleClicked(id, event);
              }),
              onFocusOut: (() => {
                this.handleFocusOut();
              }),
              onMouseUp: (() => {
                this.handleMouseUp();
              }),
              onMouseDown: (() => {
                this.handleMouseDown();
              }),
              onDragStart: ((button) => {
                this.handleDragStart(button);
              }),
              onDragEnter: ((button) => {
                this.handleDragEnter(button);
              }),
              onDragLeave: (() => {
                this.handleDragLeave();
              }),
              onDragEnd: (() => {
                this.handleDragEnd();
              }),
              onMovedUp: ((id) => {
                this.handleMovedUp(id);
              }),
              onMovedDown: ((id) => {
                this.handleMovedDown(id);
              })
            }
          );

          // A separator should be put between buttons of a row
          this.separators[id] = new PortfolioPlaceholderSizeSlider(
            {
              aria: {
                controls: buttonUUID,
                min: 1,
                max: 99
              }
            },
            {
              onStartedSliding: (params) => {
                this.handleSizeSliderStarted({
                  id: id,
                  x: params.x
                });
              },
              onPositionChanged: (params) => {
                this.handleSizeSliderChanged({
                  id: id,
                  x: params.x,
                  percentage: params.percentage
                });
              },
              onEndedSliding: () => {
                this.handleSizeSliderEnded();
              },
            }
          );
        }

        // Set number of columns in row according to layout
        this.buttons[id].setNumberOfColumns(colCount);
        this.buttons[id].setColumnWidth(width);
        this.separators[id]?.setPosition(width);

        rowDOM.appendChild(this.buttons[id].getDOM());

        if (
          this.separators[id] &&
          params.growHorizontals && currentCol + 1 < colCount
        ) {
          rowDOM.appendChild(this.separators[id].getDOM());
        }
      }

      this.container.appendChild(rowDOM);
    });

    this.resize();
  }

  /**
   * Handle slider resizing started.
   */
  handleSizeSliderStarted() {
    this.container.classList.add('sliding');

    for (const id in this.buttons) {
      this.buttons[id].disable();
    }
  }

  /**
   * Handle slider resizing ended.
   */
  handleSizeSliderEnded() {
    this.container.classList.remove('sliding');

    const growHorizontals = [];
    for (const id in this.buttons) {
      this.buttons[id].enable();
      growHorizontals.push(this.buttons[id].getWidthPercentage());
    }

    this.callbacks.onChanged({ growHorizontals: growHorizontals });

    this.resize();
  }

  /**
   * Handle slider is resizing.
   *
   * @param {object} [params={}] Parameters.
   */
  handleSizeSliderChanged(params = {}) {
    const button1 = this.buttons[params.id];
    const button2 = this.buttons[params.id + 1];
    const separator = this.separators[params.id];

    let percentage;
    if (params.percentage) {
      percentage = params.percentage;
    }
    else if (params.x) {
      const totalWidth =
        button1.getDOM().offsetWidth +
        separator.getDOM().offsetWidth +
        button2.getDOM().offsetWidth;

      const offset = button1.getDOM().getBoundingClientRect();
      percentage = 100 * (params.x - offset.x) / totalWidth;
    }
    else {
      return;
    }

    percentage = Math.max(1, Math.min(percentage, 99));

    button1.setColumnWidth(percentage);
    separator.setPosition(percentage);
    button2.setColumnWidth(100 - percentage);

    // TODO: Resizing causes mouse pointer flicker
    this.resize({ skipInstance: true });
  }

  /**
   * Get form for placeholder.
   *
   * @param {number} id Placeholder id.
   * @returns {object} Form.
   */
  getForm(id) {
    return this.forms[id] || null;
  }

  /**
   * Set form for placeholder.
   *
   * @param {number} id Placeholder id.
   * @param {object} form Form.
   */
  setForm(id, form) {
    this.forms[id] = form;
  }

  /**
   * Delete form for placeholder.
   *
   * @param {number} id Placeholder id.
   */
  deleteForm(id) {
    if (!this.forms[id]) {
      return;
    }

    this.forms[id] = null;
  }

  /**
   * Resize placeholders.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.skipInstance] If true, don't resize instance.
   */
  resize(params = {}) {
    if (Object.keys(this.buttons).length === 0) {
      return;
    }

    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.resizeButtons({ skipInstance: params.skipInstance });
      this.resizeToMaxHeight();
    }, 10);
  }

  /**
   * Resize buttons to match contents.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.skipInstance] If true, don't resize instance.
   */
  resizeButtons(params = {}) {
    for (let id in this.buttons) {
      this.buttons[id].resize({ skipInstance: params.skipInstance });
    }
  }

  /**
   * Resize buttons to maximum height.
   */
  resizeToMaxHeight() {
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
   *
   * @param {object} [params={}] Parameters.
   * @param {number} params.id Button id.
   * @param {HTMLElement} params.content Button content.
   * @param {HTMLElement} params.instanceDOM Element that H5P is attached to.
   * @param {H5P.ContentType} params.instance Required to attach later.
   */
  setButtonContent(params = {}) {
    if (!this.buttons[params.id]) {
      return;
    }

    this.buttons[params.id].setContent(
      params.content, params.instanceDOM, params.instance
    );

    this.resize();
  }

  /**
   * Set button content hidden.
   *
   * @param {number} id Button id.
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
   *
   * @param {number} id Button id.
   */
  focusButton(id) {
    if (!this.buttons[id]) {
      return;
    }

    this.buttons[id].focus();
  }

  /**
   * Reset buttons after dragging.
   */
  resetButtonsAfterDragging() {
    for (let id in this.buttons) {
      this.buttons[id].toggleEffect('over', false);
    }
  }

  /**
   * Swap buttons.
   *
   * @param {object} params Parameters.
   * @param {number} params.id1 Button id #1.
   * @param {number} params.id2 Button id #2.
   */
  swapButtons(params = {}) {
    // Swap visuals
    Util.swapDOMElements(
      this.buttons[params.id1].getDOM(),
      this.buttons[params.id2].getDOM()
    );

    if (params.type === 'mouse') {
      this.buttons[params.id1].attachDragPlaceholder();
    }

    // Change buttons/placeholder size to match new position
    const tmp = this.buttons[params.id1].getSwapValues();
    const tmp2 = this.buttons[params.id2].getSwapValues();
    this.buttons[params.id1].setSwapValues(tmp2);
    if (params.type === 'mouse') {
      this.buttons[params.id1].updateDragPlaceholderSize(tmp2);
    }
    this.buttons[params.id2].setSwapValues(tmp);

    // Change actual order
    [this.buttons[params.id1], this.buttons[params.id2]] =
      [this.buttons[params.id2], this.buttons[params.id1]];

    [this.forms[params.id1], this.forms[params.id2]] =
      [this.forms[params.id2], this.forms[params.id1]];

    if (params.type === 'mouse') {
      [this.newOrder[params.id1], this.newOrder[params.id2]] =
        [this.newOrder[params.id2], this.newOrder[params.id1]];
    }

    if (params.type === 'keyboard') {
      // Inform about reordering
      this.callbacks.onReordered(params.id1, params.id2);
    }
  }

  /**
   * End move.
   *
   * @param {object} params Parameters.
   * @param {number} params.id1 Button id #1.
   * @param {number} params.id2 Button id #2.
   */
  endMove(params = {}) {
    this.buttons[params.id2].focus();
    this.buttons[params.id2].select();

    this.resize();
  }

  /**
   * Handle focus out.
   */
  handleFocusOut() {
    // focusout is handled before mouseup, the selectedDraggable may be needed
    if (!this.isMouseDownOnDraggable) {
      this.selectedDraggable = null;
    }
  }

  /**
   * Handle mouse up.
   */
  handleMouseUp() {
    this.isMouseDownOnDraggable = false;
  }

  /**
   * Handle mouse down.
   */
  handleMouseDown() {
    this.isMouseDownOnDraggable = true;
  }

  /**
   * Handle drag start.
   *
   * @param {LayoutButton} button Button dragged.
   */
  handleDragStart(button) {
    this.draggedElement = button;
    this.oldOrder = [...Array(Object.keys(this.buttons).length).keys()];
    this.newOrder = [...this.oldOrder]; // real copy
  }

  /**
   * Handle drag enter.
   *
   * @param {LayoutButton} button Button dragged on.
   */
  handleDragEnter(button) {
    if (this.dropzoneElement && this.dropzoneElement === button) {
      return; // Prevent jumping when paragraph is smaller than others
    }

    this.dropzoneElement = button;

    // Swap dragged draggable and draggable that's dragged to if not identical
    if (this.dropzoneElement && this.draggedElement && this.draggedElement !== this.dropzoneElement) {
      this.swapButtons({
        id1: this.draggedElement.getId(),
        id2: this.dropzoneElement.getId(),
        type: 'mouse'
      });
    }
  }

  /**
   * Handle drag leave.
   */
  handleDragLeave() {
    this.dropzoneElement = null;
  }

  /**
   * Handle drag end.
   */
  handleDragEnd() {
    this.resetButtonsAfterDragging();

    const change = this.oldOrder.reduce((swap, id, index) => {
      if (id !== this.newOrder[index]) {
        swap.push(id);
      }
      return swap;
    }, []);

    if (change.length === 2) {
      this.callbacks.onReordered(change[0], change[1]);
    }

    this.draggedElement.focus();
    this.draggedElement = null;
    this.dropzoneElement = null;
    this.oldOrder = null;
    this.newOrder = null;

    this.resize();
  }

  /**
   * Handle button moved up.
   *
   * @param {number} id Button id.
   */
  handleMovedUp(id) {
    if (id <= 0) {
      return;
    }

    this.swapButtons({ id1: id, id2: id - 1, type: 'keyboard' });
    this.endMove({ id1: id, id2: id - 1, type: 'keyboard' });
  }

  /**
   * Handle button moved down.
   *
   * @param {number} id Button id.
   */
  handleMovedDown(id) {
    if (id >= this.buttons.length - 1) {
      return;
    }

    this.swapButtons({ id1: id, id2: id + 1, type: 'keyboard' });
    this.endMove({ id1: id, id2: id + 1, type: 'keyboard' });
  }
}
