/** Class for utility functions */
class Util {
  /**
   * Extend an array just like JQuery's extend.
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
   * Validate layout.
   * @param {string} layout Layout to be validated.
   * @returns {boolean} True, if layout is valid. Else false.
   */
  static validateLayout(layout) {
    return typeof layout === 'string' && /^[0-9]+(-[0-9]+)*$/.test(layout);
  }

  /**
   * Count number of layout fields.
   * @param {string} layout Layout.
   * @returns {number|undefined} Number of fields in layout.
   */
  static countLayoutFields(layout) {
    if (!Util.validateLayout(layout)) {
      return;
    }

    return layout.split('-').reduce((sum, cols) => sum += Number(cols), 0);
  }
}

export default Util;
