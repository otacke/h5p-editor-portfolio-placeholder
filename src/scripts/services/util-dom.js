/** @constant {number} DOUBLE_CLICK_COUNT Number of clicks for double click. */
const DOUBLE_CLICK_COUNT = 2;

/** @constant {number} DOUBLE_CLICK_TIME_MS Double click time in ms */
const DOUBLE_CLICK_TIME_MS = 300;

/**
 * Swap two DOM elements.
 * @param {HTMLElement} element1 Element 1.
 * @param {HTMLElement} element2 Element 2.
 */
export const swapDOMElements = (element1, element2) => {
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
};

/**
 * Double click handler.
 * @param {Event} event Regular click event.
 * @param {function} callback Function to execute on doubleClick.
 */
export const doubleClick = (event, callback) => {
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
    if (event.target.count === DOUBLE_CLICK_COUNT) {
      callback();
    }
    event.target.count = 0;
  }, DOUBLE_CLICK_TIME_MS);
};
