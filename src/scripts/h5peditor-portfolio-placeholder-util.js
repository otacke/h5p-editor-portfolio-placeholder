/** Class for utility functions */
class Util {
  /**
   * Extend an array just like JQuery's extend.
   *
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Swap two DOM elements.
   *
   * @param {HTMLElement} element1 Element 1.
   * @param {HTMLElement} element2 Element 2.
   */
  static swapDOMElements(element1, element2) {
    const parent1 = element1.parentNode;
    const parent2 = element2.parentNode;

    if (!parent1 || !parent2) {
      return;
    }

    const replacement1 = document.createElement('div');
    const replacement2 = document.createElement('div');

    parent1.replaceChild(replacement1, element1);
    parent2.replaceChild(replacement2, element2);
    parent1.replaceChild(element2, replacement1);
    parent2.replaceChild(element1, replacement2);
  }

  /**
   * Validate layout.
   *
   * @param {string} layout Layout to be validated.
   * @returns {boolean} True, if layout is valid. Else false.
   */
  static validateLayout(layout) {
    return typeof layout === 'string' && /^[0-9]+(-[0-9]+)*$/.test(layout);
  }

  /**
   * Count number of layout fields.
   *
   * @param {string} layout Layout.
   * @returns {number} Number of fields in layout.
   */
  static countLayoutFields(layout) {
    if (!Util.validateLayout(layout)) {
      return;
    }

    return layout.split('-').reduce((sum, cols) => sum += Number(cols), 0);
  }

  /**
   * Double click handler.
   *
   * @param {Event} event Regular click event.
   * @param {function} callback Function to execute on doubleClick.
   */
  static doubleClick(event, callback) {
    if (!event || typeof callback !== 'function') {
      return;
    }

    if (isNaN(event.target.count)) {
      event.target.count = 1;
    }
    else {
      event.target.count++;
    }

    setTimeout(() => {
      if (event.target.count === 2) {
        callback();
      }
      event.target.count = 0;
    }, Util.DOUBLE_CLICK_TIME);
  }

  /**
   * Look for field with given name in given collection.
   *
   * @param {string} name Name of field to look for.
   * @param {object[]} fields Collection to look in.
   * @returns {object} Field object.
   */
  static findField(name, fields) {
    return fields.find(field => field.name === name);
  }
}

/** @constant {number} Double click time */
Util.DOUBLE_CLICK_TIME = 300;

export default Util;
